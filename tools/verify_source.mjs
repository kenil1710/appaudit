/**
 * verify_source — reads each deployed contract's code BACK FROM STUDIO DEV
 * (gen_getContractCode) and compares it byte-for-byte with the file at HEAD
 * and with the sha256 recorded in deployments.json.
 *
 *   node tools/verify_source.mjs            # prints a table, exit 1 on mismatch
 *   node tools/verify_source.mjs --md       # the same table as markdown
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const root = new URL("..", import.meta.url).pathname;
const require = createRequire(new URL("../test/package.json", import.meta.url));
const { createClient } = require("genlayer-js");
const { studioDevnet } = require("genlayer-js/chains");

const sha = (b) => createHash("sha256").update(b).digest("hex");
const dep = JSON.parse(readFileSync(root + "deployments.json", "utf8")).deployments.studiodev;
const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"]).toString().trim();
const FILES = {
  AppAudit: "contracts/AppAudit.py",
  AppAuditDemo: "contracts/AppAudit.py",
  AppTrustConsumer: "contracts/AppTrustConsumer.py",
  AppAuditV2: "contracts/AppAuditV2.py",
  AppAuditV2Demo: "contracts/AppAuditV2.py",
  AppTrustConsumerV2: "contracts/AppTrustConsumerV2.py",
};
const client = createClient({ chain: studioDevnet });
const rows = [];
let bad = 0;
for (const [name, file] of Object.entries(FILES)) {
  const rec = dep[name];
  if (!rec) { rows.push([name, "-", "not deployed", "", "", ""]); bad++; continue; }
  let chain = "";
  for (let i = 0; i < 5 && !chain; i++) {
    try { chain = await client.getContractCode(rec.address); } catch (e) { await new Promise((r) => setTimeout(r, 3000)); }
  }
  const atHead = execFileSync("git", ["-C", root, "show", `HEAD:${file}`]);
  const onChain = Buffer.from(String(chain), "utf8");
  const same = onChain.equals(atHead);
  const recorded = rec.source_sha256 === sha(atHead);
  if (!same || !recorded) bad++;
  rows.push([name, rec.address, file, sha(onChain), same ? "identical" : "DIFFERS", recorded ? "match" : "MISMATCH"]);
}
// Superseded contracts, against the tree each was deployed from. r1 was
// deployed from 8f9db85, which the history rewrite renamed d52d5e1 (same tree).
const RENAMED = { "8f9db859eddea3455b4558651cea8cab2660165f": "d52d5e1" };
for (const [group, recs] of Object.entries(dep.superseded ?? {})) {
  for (const [name, rec] of Object.entries(recs)) {
    const file = rec.source_path ?? (name.startsWith("AppTrustConsumer") ? "contracts/AppTrustConsumerV2.py" : "contracts/AppAuditV2.py");
    const commit = RENAMED[rec.commit] ?? rec.commit;
    let chain = "";
    for (let i = 0; i < 5 && !chain; i++) {
      try { chain = await client.getContractCode(rec.address); } catch (e) { await new Promise((r) => setTimeout(r, 3000)); }
    }
    const at = execFileSync("git", ["-C", root, "show", `${commit}:${file}`]);
    const same = Buffer.from(String(chain), "utf8").equals(at);
    if (!same || rec.source_sha256 !== sha(at)) bad++;
    rows.push([`${name} (${group})`, rec.address, `${file} @ ${commit.slice(0, 7)}`, sha(Buffer.from(String(chain), "utf8")), same ? "identical" : "DIFFERS", rec.source_sha256 === sha(at) ? "match" : "MISMATCH"]);
  }
}
if (process.argv.includes("--md")) {
  console.log(`Read back from Studio Dev (\`gen_getContractCode\`) against HEAD \`${head}\`:\n`);
  console.log("| contract | address | file | sha256 of code on chain | chain vs HEAD | recorded sha256 |");
  console.log("|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r[0]} | \`${r[1]}\` | \`${r[2]}\` | \`${r[3]}\` | ${r[4]} | ${r[5]} |`);
} else {
  console.log(`HEAD ${head}`);
  for (const r of rows) console.log(`${r[0].padEnd(20)} ${r[1]}  ${r[4].padEnd(9)} sha ${r[3].slice(0, 16)}  recorded ${r[5]}`);
}
process.exit(bad ? 1 : 0);
