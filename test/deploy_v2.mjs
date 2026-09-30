/**
 * Deploys AppAudit v2 (canonical + demo) and AppTrustConsumerV2 to Studio Dev,
 * FROM COMMITTED HEAD ONLY.
 *
 *   node deploy_v2.mjs --all        # canonical + demo + consumer
 *   node deploy_v2.mjs --consumer   # the consumer only (reads the demo)
 *
 * The source sent is read with `git show HEAD:<path>`, not from the working
 * tree, and the script refuses to run if either v2 contract differs from HEAD.
 * deployments.json records the commit, the byte count and the sha256 of what
 * was sent; tools/audit_v2.py and tools/verify_source.mjs check both against
 * the repository and against the code Studio Dev returns.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient, createAccount } from "genlayer-js";
import { CHAINS, accounts, fundOnStudio, deploy, gen } from "./harness.mjs";

const chain = CHAINS.studiodev;
const all = process.argv.includes("--all");
const consumerOnly = process.argv.includes("--consumer");
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const git = (...a) => execFileSync("git", ["-C", new URL("..", import.meta.url).pathname, ...a]);

const AUDIT = "contracts/AppAuditV2.py";
const CONSUMER = "contracts/AppTrustConsumerV2.py";
const dirty = git("status", "--porcelain", "--", AUDIT, CONSUMER).toString().trim();
if (dirty) {
  console.error(`refusing to deploy: v2 contracts differ from HEAD\n${dirty}`);
  process.exit(1);
}
const commit = git("rev-parse", "HEAD").toString().trim();
const code = git("show", `HEAD:${AUDIT}`);
const consumerCode = git("show", `HEAD:${CONSUMER}`);

const acc = accounts();
const account = createAccount(acc.client.key);
const wallet = createClient({ chain, account });
const read = createClient({ chain });
console.log(`\nAppAudit v2 deploy → studiodev from commit ${commit}`);
console.log(`  signer     ${account.address} (client)`);
await fundOnStudio(chain, account.address, 2000n * 10n ** 18n);
console.log(`  balance    ${gen(await read.getBalance({ address: account.address }))} GEN`);

const path = new URL("../deployments.json", import.meta.url);
const doc = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { deployments: {} };
const record = doc.deployments.studiodev;
const persist = () => writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");

const GEN = 10n ** 18n;
// (min_stake, contest_stake, respond_s, contest_s, stall_s, file_cooldown_s,
//  snapshot_fee, reverify_cooldown_s) — all immutable after deploy.
const VARIANTS = {
  AppAuditV2: {
    label: "canonical (0.5 / 0.3 GEN, 48h respond, 24h contest, 48h stall, 300s cooldown, 0.01 GEN snapshot, 24h re-verify)",
    args: [GEN / 2n, (3n * GEN) / 10n, 48 * 3600, 24 * 3600, 48 * 3600, 300, GEN / 100n, 24 * 3600],
  },
  AppAuditV2Demo: {
    label: "demo (same source: respond 10min, contest 10min, stall 10min, no cooldown, 5min re-verify)",
    args: [GEN / 2n, (3n * GEN) / 10n, 600, 600, 600, 0, GEN / 100n, 300],
  },
};

const names = consumerOnly ? [] : all ? ["AppAuditV2", "AppAuditV2Demo"] : [];
for (const name of names) {
  const { label, args } = VARIANTS[name];
  console.log(`\n  ${name}  ${label}`);
  const res = await deploy({ chain, wallet, read, code: code.toString("utf8"), args, label: `${name} deploy` });
  if (!res.ok) {
    console.error(`${name} deploy FAILED: ${res.out?.status} ${res.reason ?? ""}`);
    process.exit(1);
  }
  console.log(`  address    ${res.address}`);
  record[name] = {
    address: res.address,
    deploy_tx: res.hash,
    commit,
    source_path: AUDIT,
    source_bytes: code.length,
    source_sha256: sha256(code),
    owner: account.address,
    rubric_version: String(code).match(/^RUBRIC_VERSION = "([^"]+)"/m)[1],
    min_stake_wei: args[0].toString(),
    contest_stake_wei: args[1].toString(),
    response_window_s: args[2],
    contest_window_s: args[3],
    stall_ttl_s: args[4],
    file_cooldown_s: args[5],
    snapshot_fee_wei: args[6].toString(),
    reverify_cooldown_s: args[7],
    deployed_at: new Date().toISOString(),
  };
  persist();
}

if (all || consumerOnly) {
  const audit = record.AppAuditV2Demo.address;
  console.log(`\n  AppTrustConsumerV2  reads ${audit}`);
  const res = await deploy({ chain, wallet, read, code: consumerCode.toString("utf8"), args: [audit, 50], label: "AppTrustConsumerV2 deploy" });
  if (!res.ok) {
    console.error(`consumer deploy FAILED: ${res.out?.status} ${res.reason ?? ""}`);
    process.exit(1);
  }
  console.log(`  address    ${res.address}`);
  record.AppTrustConsumerV2 = {
    address: res.address,
    deploy_tx: res.hash,
    commit,
    source_path: CONSUMER,
    source_bytes: consumerCode.length,
    source_sha256: sha256(consumerCode),
    audit,
    min_score: 50,
    owner: account.address,
    custody: false,
    payable_methods: 0,
    deployed_at: new Date().toISOString(),
  };
  persist();
}
console.log("\nwrote deployments.json");
