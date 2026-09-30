/** node trial_call.mjs <role> <method> <valueWei> <jsonArgs> — one write on the trial v2 instance. */
import { readFileSync } from "node:fs";
import { connect, fundOnStudio, returnedJson, estimateFees, argOf } from "./harness.mjs";
const address = argOf("address", JSON.parse(readFileSync(new URL("./.trial_v2.json", import.meta.url))).address);
const [role, method, value, args] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const c = connect({ address, role });
await fundOnStudio(c.chain, c.account.address, 50n * 10n ** 18n);
const t0 = Date.now();
const out = await c.send(method, JSON.parse(args), BigInt(value), { fees: await estimateFees(c.wallet, method) });
console.log(method, out.status, out.ok, ((Date.now() - t0) / 1000).toFixed(0) + "s", out.hash);
console.log(JSON.stringify(returnedJson(out) ?? out.returned ?? out.revertReason));
if (!out.ok) console.log(out.stderr.slice(-2500));
