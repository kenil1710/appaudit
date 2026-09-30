/** Measures whether emit_transfer delivers on Studio Dev, per `on=` stage. */
import { readFileSync } from "node:fs";
import { connect, deploy, fundOnStudio, gen, sleep, waitFinalized } from "./harness.mjs";
const base = connect({ address: "0x0000000000000000000000000000000000000000", role: "client" });
await fundOnStudio(base.chain, base.account.address, 100n * 10n ** 18n);
const code = readFileSync(new URL("../contracts/_probe_pay.py", import.meta.url));
const res = await deploy({ chain: base.chain, wallet: base.wallet, read: base.read, code, args: [], label: "probe_pay deploy" });
if (!res.ok) { console.error("deploy failed", res.out?.stderr?.slice(-800)); process.exit(1); }
console.log("probe_pay at", res.address);
const c = connect({ address: res.address, role: "client" });
let out = await c.send("deposit", [], 3n * 10n ** 18n);
console.log("deposit", out.status, out.hash);
const to = connect({ address: res.address, role: "outsider" }).account.address;
for (const stage of ["decided", "accepted", "default"]) {
  const before = await c.read.getBalance({ address: to });
  out = await c.send("send", [to, 10n ** 17n, stage], 0n);
  console.log(stage, out.status, out.hash, JSON.stringify(out.returned));
  const fin = await waitFinalized(c.read, out.hash, { timeoutMs: 300000 });
  await sleep(20000);
  const after = await c.read.getBalance({ address: to });
  console.log(`  ${stage}: finalized=${fin.finalized} delta=${gen(after - before)} GEN  contract=${gen(await c.read.getBalance({ address: res.address }))}`);
}
