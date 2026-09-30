/** Trial deploy of contracts/AppAuditV2.py with demo windows; prints address. */
import { readFileSync, writeFileSync } from "node:fs";
import { connect, deploy, fundOnStudio, argOf } from "./harness.mjs";
const base = connect({ address: "0x0000000000000000000000000000000000000000", role: "client" });
await fundOnStudio(base.chain, base.account.address, 500n * 10n ** 18n);
const code = readFileSync(new URL("../contracts/AppAuditV2.py", import.meta.url));
const GEN = 10n ** 18n;
const args = [GEN / 2n, (3n * GEN) / 10n, 600, 600, 600, 0, GEN / 100n, 60];
const res = await deploy({ chain: base.chain, wallet: base.wallet, read: base.read, code, args, label: "AppAuditV2 trial" });
console.log(res.ok, res.address, res.hash, res.out?.status, (res.out?.stderr ?? "").slice(-3000));
if (res.ok) writeFileSync(new URL("./.trial_v2.json", import.meta.url), JSON.stringify({ address: res.address }));
