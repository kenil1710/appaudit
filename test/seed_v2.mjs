/**
 * Seeds the v2 DEMO instance through real consensus rounds on Studio Dev, with
 * REAL apps only, and writes every transaction to docs/seed-v2.json.
 *
 *   caffeinate -dims node seed_v2.mjs
 *
 * RESUMABLE: every step first asks the chain whether it already happened, and
 * the ids of what was created are kept in test/.seed_v2.json. The script's
 * memory is never evidence: collect_v2.mjs reads the chain afterwards.
 *
 * Model-decided seeds (POLICY_LABEL, LABEL) are run TWICE, the second run
 * after the first has closed, so the two readings can be compared.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { connect, fundOnStudio, returnedJson, sleep, estimateFees } from "./harness.mjs";

const dep = JSON.parse(readFileSync(new URL("../deployments.json", import.meta.url))).deployments.studiodev;
const address = dep.AppAuditV2Demo.address;
const consumer = dep.AppTrustConsumerV2.address;
const GEN = 10n ** 18n;
const HALF = GEN / 2n;
const SNAP_FEE = GEN / 100n;
const statePath = new URL("./.seed_v2.json", import.meta.url);
const logPath = new URL("../docs/seed-v2.json", import.meta.url);
const S = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { cases: {}, txs: [] };
const save = () => {
  writeFileSync(statePath, JSON.stringify(S, null, 2));
  writeFileSync(logPath, JSON.stringify({ address, consumer, txs: S.txs, cases: S.cases, reads: S.reads ?? {} }, null, 2) + "\n");
};

const roles = ["client", "advocate1", "advocate2", "advocate3", "advocate4", "advocate5",
  "advocate6", "dev1", "dev2", "dev3", "dev4", "trigger", "outsider"];
const C = {};
for (const r of roles) C[r] = connect({ address, role: r });
for (const r of roles) await fundOnStudio(C[r].chain, C[r].account.address, 30n * GEN);
const K = connect({ address: consumer, role: "trigger" });
const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x instanceof Map ? Object.fromEntries(x) : x)));
const view = async (m, a = []) => plain(await C.trigger.view(m, a));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const PLAY = (pkg) => `https://play.google.com/store/apps/details?id=${pkg}`;
const APPS = {
  snapchat: [PLAY("com.snapchat.android"), "https://apps.apple.com/us/app/snapchat/id447188370"],
  capcut: [PLAY("com.lemon.lvoverseas"), "https://apps.apple.com/us/app/capcut-photo-video-editor/id1500855883"],
  whatsapp: [PLAY("com.whatsapp"), "https://apps.apple.com/us/app/whatsapp-messenger/id310633997"],
  instagram: [PLAY("com.instagram.android"), ""],
  facebook: ["", "https://apps.apple.com/us/app/facebook/id284882215"],
  linkedin: [PLAY("com.linkedin.android"), ""],
  pinterest: [PLAY("com.pinterest"), "https://apps.apple.com/us/app/pinterest/id429047995"],
  temu: [PLAY("com.einnovation.temu"), ""],
};

/** One write. Heavy writes (consensus rounds) take the generic fee estimate;
 *  money-moving writes are simulated so the transfer is budgeted. */
async function step(label, role, method, args, value = 0n, heavy = true) {
  const opts = heavy ? { fees: await estimateFees(C[role].wallet, method) } : {};
  const out = await C[role].send(method, args, value, opts);
  const ret = returnedJson(out);
  const row = { label, role, from: C[role].account.address, method, args: plain(args), value: value.toString(),
    status: out.status, hash: out.hash, seconds: Math.round(out.seconds), returned: ret, at: new Date().toISOString() };
  S.txs.push(row);
  save();
  log(`${label.padEnd(34)} ${method.padEnd(19)} ${String(out.status).padEnd(10)} ${String(Math.round(out.seconds)).padStart(4)}s ${out.hash ?? ""}`);
  if (ret?.status === "REJECTED") log(`   REJECTED: ${ret.reason}`);
  return { out, ret };
}

const caseOf = async (id) => view("get_case", [id]);

/** File a case once. The case id is read OFF THE CHAIN (newest case by this
 *  advocate with this kind/app/topic that is not yet in state). */
async function fileOnce(key, role, method, args) {
  if (S.cases[key]) return S.cases[key];
  for (let attempt = 1; attempt <= 4; attempt++) {
    const before = (await view("get_cases_by_advocate", [C[role].account.address])).items.length;
    const { ret } = await step(`${key} file #${attempt}`, role, method, args, HALF);
    await sleep(3000);
    const items = (await view("get_cases_by_advocate", [C[role].account.address])).items;
    if (items.length > before) {
      const id = items[items.length - 1].challenge_id;
      S.cases[key] = id;
      save();
      log(`   → case #${id} filing_result ${items[items.length - 1].filing_result}`);
      return id;
    }
    if (ret?.status === "REJECTED" && !/could not agree/.test(ret.reason)) return null;
    log("   → not stored (no agreed round); retrying in 45s");
    await sleep(45_000);
  }
  return null;
}

async function respondOnce(key, role) {
  const id = S.cases[key];
  if (!id) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if ((await caseOf(id)).status !== "FILED") return;
    await step(`${key} respond`, role, "respond",
      [id, "Our store declarations and policy are accurate; we contest this reading.", ""], HALF, false);
    await sleep(3000);
  }
}

async function judgeUntil(key, attempts = 6) {
  const id = S.cases[key];
  if (!id) return null;
  for (let i = 1; i <= attempts; i++) {
    const c = await caseOf(id);
    if (c.judged_at > 0) return c;
    if (c.status !== "RESPONDED") return c;
    const { ret } = await step(`${key} judge #${i}`, "trigger", "judge", [id]);
    await sleep(4000);
    const after = await caseOf(id);
    if (after.judged_at > 0) {
      log(`   → ${after.outcome} (filing ${after.filing_result}, judgment ${after.judgment_result})`);
      return after;
    }
    log(`   → not settled (${ret?.reason ?? "no agreed reading"}); retrying in 40s`);
    await sleep(40_000);
  }
  return caseOf(id);
}

async function finalizeWhenDue(key) {
  const id = S.cases[key];
  if (!id) return;
  let c = await caseOf(id);
  if (c.status !== "SETTLED") return;
  const due = c.contest.window_ends + 15 - Math.floor(Date.now() / 1000);
  if (due > 0) { log(`waiting ${due}s for #${id}'s contest window`); await sleep(due * 1000); }
  for (let i = 0; i < 3 && (await caseOf(id)).status === "SETTLED"; i++) {
    await step(`${key} finalize`, "trigger", "finalize", [id]);
    await sleep(4000);
  }
}

log(`AppAudit v2 seed → ${address}`);

// --- A. identity refusals (real listings, no stake) -----------------------
if (!S.idDone) {
  await step("identity: Temu (file served, wallet absent)", "dev1", "register_developer", [APPS.temu[0]]);
  await step("identity: Snapchat (no file)", "dev2", "register_developer", [APPS.snapchat[0]]);
  await step("identity: Pinterest App Store (file served, wallet absent)", "dev3", "register_developer", [APPS.pinterest[1]]);
  S.idDone = true;
  save();
}

// --- B. refusal: two different apps -----------------------------------------
if (!S.pairDone) {
  await step("cross: Instagram (Play) + Facebook (App Store)", "outsider", "file_cross_store",
    [APPS.instagram[0], APPS.facebook[1], "identifiers", "share"], HALF);
  S.pairDone = true;
  save();
}

// --- C. run 1 ---------------------------------------------------------------
const RUN1 = [
  ["cross-snapchat-identifiers", "advocate1", "dev1", "file_cross_store", [...APPS.snapchat, "identifiers", "share"]],
  ["cross-capcut-identifiers", "advocate2", "dev2", "file_cross_store", [...APPS.capcut, "identifiers", "share"]],
  ["cross-whatsapp-location", "advocate3", "dev3", "file_cross_store", [...APPS.whatsapp, "location", "share"]],
  ["policy-linkedin-identifiers#1", "advocate4", "dev4", "file_policy", [APPS.linkedin[0], "", "identifiers", "share"]],
  ["policy-capcut-personal#1", "advocate5", "dev1", "file_policy", [APPS.capcut[0], "", "personal", "share"]],
  ["policy-pinterest-identifiers#1", "advocate6", "dev2", "file_policy", [APPS.pinterest[0], "", "identifiers", "share"]],
  ["label-whatsapp-location#1", "advocate1", "dev3", "file_challenge", [APPS.whatsapp[0], "", "This app does not collect location data"]],
];
const RUN2 = [
  ["policy-linkedin-identifiers#2", "advocate4", "dev4", "file_policy", [APPS.linkedin[0], "", "identifiers", "share"]],
  ["policy-capcut-personal#2", "advocate5", "dev1", "file_policy", [APPS.capcut[0], "", "personal", "share"]],
  ["policy-pinterest-identifiers#2", "advocate6", "dev2", "file_policy", [APPS.pinterest[0], "", "identifiers", "share"]],
  ["label-whatsapp-location#2", "advocate1", "dev3", "file_challenge", [APPS.whatsapp[0], "", "This app does not collect location data"]],
];

/** A second witness of the filing capture (fix 7): only a confirmed capture
 *  can ever become CORRECTED. Anyone may call it; the seed does, once. */
async function confirmOnce(key) {
  const id = S.cases[key];
  if (!id) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const c = await caseOf(id);
    if (c.filing.confirmed || !["FILED", "RESPONDED"].includes(c.status)) return;
    await step(`${key} confirm #${attempt}`, "trigger", "confirm_filing", [id]);
    await sleep(3000);
  }
}

async function run(list) {
  for (const [key, adv, dev, method, args] of list) {
    await fileOnce(key, adv, method, args);
    await confirmOnce(key);
    await respondOnce(key, dev);
  }
  for (const [key] of list) {
    await sleep(20_000);
    await judgeUntil(key);
  }
}

await run(RUN1);

// --- D. snapshots for three apps ---------------------------------------------
if (!S.snapDone) {
  for (const app of ["whatsapp", "snapchat", "linkedin"]) {
    await step(`snapshot ${app}`, "outsider", "snapshot", [APPS[app][0]], SNAP_FEE);
  }
  await step("snapshot WhatsApp App Store", "outsider", "snapshot", [APPS.whatsapp[1]], SNAP_FEE);
  S.snapDone = true;
  save();
}

for (const [key] of RUN1) await finalizeWhenDue(key);

// --- E. run 2 of every model-decided seed -----------------------------------
await run(RUN2);
for (const [key] of RUN2) await finalizeWhenDue(key);

// --- F. withdraw flows ---------------------------------------------------------
if (!S.withdrawDone) {
  for (const r of ["advocate1", "advocate2", "advocate3", "advocate4", "advocate5", "advocate6",
    "dev1", "dev2", "dev3", "dev4", "outsider"]) {
    const bal = await view("get_balance", [C[r].account.address]);
    if (BigInt(bal.claimable_wei) > 0n) await step(`withdraw ${r}`, r, "withdraw", [], 0n, false);
  }
  await step("withdraw advocate1 again (must refuse)", "advocate1", "withdraw", [], 0n, false);
  const fees = await view("get_balance", [C.client.account.address]);
  if (BigInt(fees.fees_wei) > 0n) await step("withdraw_fees (fee recipient)", "client", "withdraw_fees", [], 0n, false);
  S.withdrawDone = true;
  save();
}

// --- G. consumer reads -----------------------------------------------------------
S.reads = {};
for (const [name, url] of [["snapchat-play", APPS.snapchat[0]], ["snapchat-appstore", APPS.snapchat[1]],
  ["capcut-play", APPS.capcut[0]], ["whatsapp-play", APPS.whatsapp[0]], ["linkedin-play", APPS.linkedin[0]],
  ["pinterest-play", APPS.pinterest[0]]]) {
  S.reads[name] = plain(await K.view("app_record", [url]));
}
S.reads.stats = await view("get_stats");
save();
log("done");
console.log(JSON.stringify(S.reads, null, 1));
