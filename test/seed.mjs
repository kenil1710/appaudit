/**
 * Seeds the DEMO instance with every path of the state machine, through real
 * consensus rounds on Studio Dev, and then drains it to zero.
 *
 *   1  WhatsApp  (Google Play)  "does not collect location"      → CONTRADICTED
 *   2  Instagram (App Store)    "collects user content"          → CLAIM_VERIFIED
 *   3  Spotify   (Google Play)  "shares browsing history…"       → INCONCLUSIVE
 *   4  TikTok    (Google Play)  "does not share photos/videos"   → CONTRADICTED,
 *                                 contested by the developer, HELD, stake forfeited
 *   5  Facebook  (Google Play)  no response                      → DEFAULTED
 *   6  Telegram  (Google Play)  withdrawn before any response    → WITHDRAWN
 *   7  Snapchat  (Google Play)  responded, never judged          → STALLED,
 *                                 settled WHILE THE CONTRACT IS PAUSED
 *
 * Then every challenge is paid out through claim_payout and the contract's own
 * books must read zero. The script's memory is not evidence: collect.mjs reads
 * the chain afterwards and writes docs/EVIDENCE.md from what is actually there.
 */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { connect, fundOnStudio, returnedJson, sleep, argOf, estimateFees } from "./harness.mjs";

const dep = JSON.parse(readFileSync(new URL("../deployments.json", import.meta.url))).deployments.studiodev;
const address = argOf("address", dep.AppAuditDemo.address);
const consumerAddress = dep.AppTrustConsumer?.address;
const GEN = 10n ** 18n;
const HALF = GEN / 2n;
const CONTEST = (3n * GEN) / 10n;
const log = [];
const note = (...a) => { const line = a.join(" "); console.log(line); log.push(line); };

const roles = ["client", "advocate1", "advocate2", "advocate3", "advocate4", "advocate5",
  "advocate6", "dev1", "dev2", "dev3", "dev4", "trigger", "outsider"];
const C = {};
for (const r of roles) C[r] = connect({ address, role: r });
for (const r of roles) await fundOnStudio(C[r].chain, C[r].account.address, 20n * GEN);
const view = (m, a = []) => C.trigger.view(m, a);
const asObj = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x instanceof Map ? Object.fromEntries(x) : x)));

async function step(label, role, method, args, value = 0n, renders = false) {
  // Writes that render a page (judge, contest) post no transfer, so they take
  // the generic fee estimate instead of a SIMULATION - which would render the
  // listing a sixth time on a render service that already buckles under load.
  const opts = renders ? { fees: await estimateFees(C[role].wallet, method) } : {};
  const out = await C[role].send(method, args, value, opts);
  const ret = returnedJson(out);
  note(`${label.padEnd(26)} ${method.padEnd(18)} ${String(out.status).padEnd(12)} ${out.seconds.toFixed(0).padStart(4)}s  ${out.hash ?? ""}`);
  if (ret && ret.status === "REJECTED") note(`   REJECTED: ${ret.reason}`);
  return { out, ret };
}

/** The id of the newest challenge filed by `role` - read off the chain, never
 *  assumed from a return value the SDK may not decode. */
async function newestBy(role) {
  const v = asObj(await view("get_challenges_by_advocate", [C[role].account.address]));
  const items = v.items ?? [];
  return items.length ? items[items.length - 1].challenge_id : null;
}

/** RESUMABLE. A seed that dies halfway (Studio's render service has been
 *  measured failing mid-run) is re-run, and every step first asks the chain
 *  whether it already happened. */
async function existing(role, url, claim) {
  const v = asObj(await view("get_challenges_by_advocate", [C[role].account.address]));
  const key = asObj(await view("preview_claim", [url, "", claim])).app_key;
  const hit = (v.items ?? []).filter((c) => c.app_key === key && c.claim === claim).pop();
  return hit ? hit.challenge_id : null;
}

let fresh = false;
async function fileAs(label, role, url, claim) {
  const had = await existing(role, url, claim);
  if (had) { note(`${label.padEnd(26)} already filed → challenge #${had}`); return had; }
  fresh = true;
  await step(label, role, "file_challenge", [url, "", claim], HALF);
  const cid = await newestBy(role);
  note(`   → challenge #${cid}`);
  return cid;
}

const statusOf = async (cid) => asObj(await view("get_challenge", [cid]));
async function ifStatus(cid, status, fn) {
  if ((await statusOf(cid)).status === status) await fn();
}

async function judgeUntil(label, cid, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    const before = await statusOf(cid);
    if (before.judged_at > 0) { note(`${label.padEnd(26)} already judged → ${before.outcome}`); return before; }
    if (before.status !== "RESPONDED") return before;
    // A breather for Studio's shared render service: a judgment is five page
    // loads, and three back to back were measured to make it fail.
    await sleep(60_000);
    const { out, ret } = await step(`${label} judge #${i}`, "trigger", "judge", [cid], 0n, true);
    if (out.status === "UNSETTLED") {
      // NOT a failure. Studio was measured leaving a judge() PENDING for over
      // twenty minutes and then finalizing it correctly. Re-sending would only
      // queue a duplicate behind it, so watch the chain instead.
      note("   → still pending on Studio; watching the chain rather than re-sending");
      for (let w = 0; w < 90; w++) {
        await sleep(30_000);
        if ((await statusOf(cid)).judged_at > 0) break;
      }
    }
    const ch = asObj(await view("get_challenge", [cid]));
    if (ch.judged_at > 0) {
      note(`   → ${ch.outcome} strength ${ch.evidence_strength} case ${ch.case} matched [${ch.matched}] hash ${ch.content_hash}`);
      return ch;
    }
    note(`   → not settled (${ret?.reason ?? "no agreed reading"}); retrying`);
  }
  return asObj(await view("get_challenge", [cid]));
}

async function waitUntil(ts, why) {
  const secs = Math.max(0, ts - Math.floor(Date.now() / 1000)) + 20;
  note(`waiting ${secs}s ${why}`);
  await sleep(secs * 1000);
}

note(`AppAudit seed → ${address} @ ${new Date().toISOString()}`);

const S = {};
S.wa = await fileAs("1 WhatsApp", "advocate1", "https://play.google.com/store/apps/details?id=com.whatsapp",
  "This app does not collect location data");
S.ig = await fileAs("2 Instagram", "advocate2", "https://apps.apple.com/us/app/instagram/id389801252",
  "This app collects user content");
S.sp = await fileAs("3 Spotify", "advocate3", "https://play.google.com/store/apps/details?id=com.spotify.music",
  "This app shares browsing history with advertisers");
S.tt = await fileAs("4 TikTok", "advocate4", "https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically",
  "This app does not share photos or videos with other companies");
S.fb = await fileAs("5 Facebook", "advocate5", "https://play.google.com/store/apps/details?id=com.facebook.katana",
  "This app does not collect your contacts");
S.tg = await fileAs("6 Telegram", "advocate6", "https://play.google.com/store/apps/details?id=org.telegram.messenger",
  "This app does not share location with third parties");
S.sc = await fileAs("7 Snapchat", "advocate1", "https://play.google.com/store/apps/details?id=com.snapchat.android",
  "This app does not collect photos or videos");

// Attack vectors, live: a duplicate claim and a non-store URL are refused and
// the stake sits on the sender's refund ledger. Only on a fresh run.
if (fresh) {
await step("dup claim (refused)", "outsider", "file_challenge",
  ["https://play.google.com/store/apps/datasafety?id=com.whatsapp", "", "This app does NOT collect location data."], HALF);
await step("non-store (refused)", "outsider", "file_challenge",
  ["https://example.com/app?id=com.whatsapp", "", "This app does not collect location data"], HALF);
await step("self-response (refused)", "advocate1", "respond",
  [S.wa, "I am the advocate and I also defend the claim here.", ""], HALF);

}

await ifStatus(S.tg, "FILED", () => step("6 Telegram", "advocate6", "withdraw_challenge", [S.tg]));

await ifStatus(S.wa, "FILED", () => step("1 WhatsApp", "dev1", "respond", [S.wa,
  "Our listing is correct: location is only used for nearby features the user opts in to.",
  "https://www.whatsapp.com/legal/privacy-policy"], HALF));
await ifStatus(S.ig, "FILED", () => step("2 Instagram", "dev2", "respond", [S.ig,
  "The claim is accurate and our App Privacy label discloses user content as linked data.", ""], HALF));
await ifStatus(S.sp, "FILED", () => step("3 Spotify", "dev3", "respond", [S.sp,
  "We do not share browsing history with advertisers; the listing declares no such thing.", ""], HALF));
await ifStatus(S.tt, "FILED", () => step("4 TikTok", "dev4", "respond", [S.tt,
  "Photos and videos are only shared when a user chooses to post them publicly.", ""], HALF));
await ifStatus(S.sc, "FILED", () => step("7 Snapchat", "dev1", "respond", [S.sc,
  "Media is processed on device unless the user sends a snap to a friend.", ""], HALF));

const J = {};
J.wa = await judgeUntil("1 WhatsApp", S.wa);
J.ig = await judgeUntil("2 Instagram", S.ig);
J.sp = await judgeUntil("3 Spotify", S.sp);
J.tt = await judgeUntil("4 TikTok", S.tt);

if ((await statusOf(S.tt)).status === "SETTLED") {
await step("4 copy-contest (refused)", "dev4", "contest", [S.tt,
  "Photos and videos are only shared when a user chooses to post them publicly."], CONTEST);
await step("4 winner-contest (refused)", "advocate4", "contest", [S.tt,
  "Adding something new so the novelty gate is not the reason for refusal."], CONTEST);
for (let i = 1; i <= 3; i++) {
  const { ret } = await step(`4 TikTok contest #${i}`, "dev4", "contest", [S.tt,
    "Shared photos only leave the device when the creator publishes a video; drafts stay private."], CONTEST, true);
  const ch = asObj(await view("get_challenge", [S.tt]));
  if (ch.contest.result) { note(`   → contest ${ch.contest.result}: ${ch.contest.original_outcome} → ${ch.outcome}`); break; }
  note(`   → contest not heard (${ret?.note ?? "no agreed reading"})`);
  await sleep(60_000);
}
}

const fb = asObj(await view("get_challenge", [S.fb]));
if (fb.status === "FILED") {
  await waitUntil(fb.respond_by + 1, "for Facebook's response window to close");
  await step("5 Facebook", "trigger", "default_judgment", [S.fb]);
}

const sc = asObj(await view("get_challenge", [S.sc]));
if (sc.status === "RESPONDED") {
  await waitUntil(sc.responded_at + sc.windows.stall_s, "for Snapchat to become stalled");
  await step("pause (owner)", "client", "set_paused", [true]);
  await step("7 Snapchat (paused)", "outsider", "settle_stalled", [S.sc]);
  await step("filing while paused (refused)", "outsider", "file_challenge",
    ["https://play.google.com/store/apps/details?id=com.discord", "", "This app does not collect messages"], HALF);
  await step("unpause (owner)", "client", "set_paused", [false]);
}

const window = J.wa.windows?.contest_s ?? 600;
const latest = Math.max(J.wa.judged_at, J.ig.judged_at) + window;
await waitUntil(latest + 1, "for the contest windows to close");

for (const key of ["wa", "ig"]) {
  await ifStatus(S[key], "SETTLED", async () => {
    await step(`claim before finalize (refused)`, "outsider", "claim_payout", [S[key]]);
    await step(`finalize ${key} #${S[key]}`, "outsider", "finalize", [S[key]]);
  });
}
for (const [name, cid] of Object.entries(S)) {
  const ch = await statusOf(cid);
  if (ch.settlement.locked_wei !== "0") await step(`claim ${name} #${cid}`, "outsider", "claim_payout", [cid]);
}
// Every refused call left its value on the sender's refund ledger; sweep
// every role that has one, so the books can reach zero.
for (const r of roles) {
  const owed = asObj(await view("get_refund", [C[r].account.address])).refund_wei;
  if (owed !== "0") await step(`refund ${r}`, r, "claim_refund", []);
}

if (consumerAddress) {
  const K = connect({ address: consumerAddress, role: "trigger" });
  for (const url of ["https://play.google.com/store/apps/details?id=com.whatsapp",
    "https://apps.apple.com/us/app/instagram/id389801252"]) {
    const out = await K.send("record_listing", [url]);
    note(`consumer record_listing ${url.slice(0, 60)} ${out.status} ${out.hash} ${JSON.stringify(returnedJson(out))}`);
  }
}

const stats = asObj(await view("get_stats"));
note(`stats: balance ${stats.balance_wei} locked ${stats.locked_wei} refundable ${stats.refundable_wei} balanced ${stats.ledger_balanced} chain ${stats.chain_balance_wei} undelivered ${stats.undelivered_wei}`);
appendFileSync(new URL("../docs/seed-run.log", import.meta.url), log.join("\n") + "\n");
writeFileSync(new URL("../docs/seed-ids.json", import.meta.url), JSON.stringify({ address, ids: S }, null, 2) + "\n");
