/**
 * Creates test/.accounts.json — a stable, reusable pool of signing keys.
 *
 * A POOL rather than one key because AppAudit's rules are RELATIONAL: "the
 * advocate may not respond to their own challenge", "only the losing party may
 * contest", "only the advocate may withdraw" and "judge() is permissionless"
 * cannot be stated with one address.
 *
 * Keys are generated here rather than read off `createAccount()`, which does
 * not expose a `privateKey` field — persisting it writes `undefined` and every
 * later run silently mints a fresh random account.
 *
 * Existing roles are PRESERVED across runs unless --force is passed.
 *
 * Usage: node accounts.mjs [--force]
 */
import { createAccount } from "genlayer-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const target = new URL("./.accounts.json", import.meta.url);
const force = process.argv.includes("--force");

// `client` deploys and owns the contract (its only power: pausing NEW filings).
// `advocate1..6` file one challenge each — the filing rate limit is one per
// wallet per 300s. `dev1..4` respond. `trigger` calls judge() to prove it is
// permissionless. `outsider` only ever probes access control.
const ROLES = [
  "client",
  "advocate1", "advocate2", "advocate3", "advocate4", "advocate5", "advocate6",
  "dev1", "dev2", "dev3", "dev4",
  "trigger", "outsider",
];

const existing = existsSync(target) && !force ? JSON.parse(readFileSync(target, "utf8")) : {};
const out = {};
let created = 0;

for (const role of ROLES) {
  if (existing[role]?.key) {
    out[role] = existing[role];
    continue;
  }
  const key = `0x${randomBytes(32).toString("hex")}`;
  const account = createAccount(key);
  if (createAccount(key).address !== account.address) {
    throw new Error(`key for ${role} does not derive a stable address`);
  }
  out[role] = { key, address: account.address };
  created++;
}

writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote .accounts.json — ${created} new, ${ROLES.length - created} preserved`);
for (const role of ROLES) console.log(`  ${role.padEnd(12)} ${out[role].address}`);
