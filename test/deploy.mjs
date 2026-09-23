/**
 * Deploys AppAudit (and AppTrustConsumer) to Studio Dev.
 *
 *   node deploy.mjs --both     # canonical + demo + consumer
 *   node deploy.mjs --demo     # the demo instance only
 *
 * WHY TWO INSTANCES OF THE SAME SOURCE. The canonical contract enforces the
 * brief: a 48-hour response window, a 24-hour contest window, a 48-hour stall
 * window and one filing per wallet per 300 seconds. That is the right rule and
 * it cannot be watched: a default judgment on it is two days away.
 *
 * A settlement path nobody has watched execute is a settlement path nobody has
 * tested, so a DEMO instance of byte-identical source is deployed with the
 * windows in minutes. Every rule, gate and line of consensus is the same; only
 * the constructor's clocks differ. The seed drives the demo end to end and the
 * frontend reads it; the consumer points at it for the same reason.
 *
 * Every deploy estimates its fee first (Studio Dev refuses a transaction whose
 * fee is below the floor), and the record is persisted after EACH contract so a
 * partial failure never loses a live address.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient, createAccount } from "genlayer-js";
import { CHAINS, argOf, accounts, fundOnStudio, deploy, gen } from "./harness.mjs";

const networkName = argOf("network", "studiodev");
const chain = CHAINS[networkName];
const both = process.argv.includes("--both");
const demoOnly = process.argv.includes("--demo");
const consumerOnly = process.argv.includes("--consumer");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function rubricVersion(source) {
  const m = String(source).match(/^RUBRIC_VERSION\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("no RUBRIC_VERSION in the contract source");
  return m[1];
}

const acc = accounts();
const account = createAccount(acc.client.key);
const wallet = createClient({ chain, account });
const read = createClient({ chain });

console.log(`\nAppAudit deploy → ${networkName}`);
console.log(`  signer     ${account.address} (client)`);
await fundOnStudio(chain, account.address, 2000n * 10n ** 18n);
console.log(`  balance    ${gen(await read.getBalance({ address: account.address }))} GEN`);

const path = new URL("../deployments.json", import.meta.url);
const doc = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
doc.deployments = doc.deployments || {};
const record = doc.deployments[networkName] || { network: networkName, chain_id: chain.id };
function persist() {
  record.explorer = "https://explorer-studio-dev.genlayer.com/";
  doc.deployments[networkName] = record;
  writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
}

const code = readFileSync(new URL("../contracts/AppAudit.py", import.meta.url));
const consumerCode = readFileSync(new URL("../contracts/AppTrustConsumer.py", import.meta.url));
const GEN = 10n ** 18n;

// (min_stake_wei, contest_stake_wei, response_window_s, contest_window_s,
//  stall_ttl_s, file_cooldown_s) — all six immutable after deploy.
const VARIANTS = {
  AppAudit: {
    label: "canonical (the brief: 0.5 / 0.3 GEN, 48h respond, 24h contest, 48h stall, 300s cooldown)",
    args: [GEN / 2n, (3n * GEN) / 10n, 48 * 3600, 24 * 3600, 48 * 3600, 300],
  },
  AppAuditDemo: {
    // Ten minutes, not two: a Studio Dev write was measured settling in 18 to
    // 313 seconds (grantjudge docs/PROBE.md §3), and a window shorter than the
    // latency of the call that has to land inside it is a seed bug.
    label: "demo (same source: respond 10min, contest 10min, stall 10min, no cooldown)",
    args: [GEN / 2n, (3n * GEN) / 10n, 600, 600, 600, 0],
  },
};

const wanted = consumerOnly ? [] : both ? ["AppAudit", "AppAuditDemo"] : demoOnly ? ["AppAuditDemo"] : ["AppAudit"];

for (const name of wanted) {
  const { label, args } = VARIANTS[name];
  console.log(`\n  ${name}  ${label}`);
  console.log(`  source     contracts/AppAudit.py (${code.length.toLocaleString()} bytes, sha256 ${sha256(code).slice(0, 16)}…)`);
  const res = await deploy({ chain, wallet, read, code, args, label: `${name} deploy` });
  if (!res.ok) {
    console.error(`\n${name} deploy FAILED: ${res.out?.status} ${res.reason ?? ""} ${res.out?.revertReason ?? ""}`);
    console.error((res.out?.stderr ?? "").split("\n").slice(-25).join("\n"));
    persist();
    process.exit(1);
  }
  console.log(`  address    ${res.address}`);
  record[name] = {
    address: res.address,
    deploy_tx: res.hash,
    source_bytes: code.length,
    source_sha256: sha256(code),
    owner: account.address,
    rubric_version: rubricVersion(code),
    min_stake_wei: args[0].toString(),
    contest_stake_wei: args[1].toString(),
    response_window_s: args[2],
    contest_window_s: args[3],
    stall_ttl_s: args[4],
    file_cooldown_s: args[5],
    deployed_at: new Date().toISOString(),
  };
  persist();
}

const audit = record.AppAuditDemo?.address ?? record.AppAudit?.address;
if ((both || consumerOnly) && audit) {
  console.log(`\n  AppTrustConsumer  reads ${audit}`);
  const consumerArgs = [audit, 50];
  const res = await deploy({ chain, wallet, read, code: consumerCode, args: consumerArgs, label: "AppTrustConsumer deploy" });
  if (!res.ok) {
    console.error(`\nAppTrustConsumer deploy FAILED: ${res.out?.status} ${res.reason ?? ""}`);
    console.error((res.out?.stderr ?? "").split("\n").slice(-25).join("\n"));
    persist();
    process.exit(1);
  }
  console.log(`  address    ${res.address}`);
  record.AppTrustConsumer = {
    address: res.address,
    deploy_tx: res.hash,
    source_bytes: consumerCode.length,
    source_sha256: sha256(consumerCode),
    audit,
    min_score: consumerArgs[1],
    owner: account.address,
    custody: false,
    payable_methods: 0,
    deployed_at: new Date().toISOString(),
  };
  persist();
}
console.log(`\nwrote deployments.json`);
