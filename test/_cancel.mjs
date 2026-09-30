/** node _cancel.mjs <role> <hash>... — cancel this role's PENDING Studio transactions. */
import { connect } from "./harness.mjs";
const [role, ...hashes] = process.argv.slice(2);
const c = connect({ address: "0x0000000000000000000000000000000000000000", role });
for (const hash of hashes) {
  try {
    const r = await c.wallet.cancelTransaction({ hash });
    console.log(hash.slice(0, 14), "cancel ->", JSON.stringify(r).slice(0, 200));
  } catch (e) {
    console.log(hash.slice(0, 14), "cancel FAILED", String(e.message ?? e).slice(0, 200));
  }
}
