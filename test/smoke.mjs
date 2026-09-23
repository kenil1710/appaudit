/** One challenge through file → respond → judge on a deployed instance. */
import { readFileSync } from "node:fs";
import { connect, fundOnStudio, returnedJson, argOf, gen } from "./harness.mjs";
const dep = JSON.parse(readFileSync(new URL("../deployments.json", import.meta.url))).deployments.studiodev;
const address = argOf("address", dep.AppAuditDemo.address);
const url = argOf("url", "https://play.google.com/store/apps/details?id=com.whatsapp");
const claim = argOf("claim", "This app does not collect location data");
const adv = connect({ address, role: argOf("adv", "advocate1") });
const dev = connect({ address, role: argOf("dev", "dev1") });
const trg = connect({ address, role: "trigger" });
for (const c of [adv, dev, trg]) await fundOnStudio(c.chain, c.account.address, 50n * 10n ** 18n);
const HALF = 5n * 10n ** 17n;
let out;
let cid = argOf("cid") ? Number(argOf("cid")) : null;
if (!cid) {
  out = await adv.send("file_challenge", [url, "", claim], HALF);
  console.log("file", out.status, out.seconds, typeof out.returned === "string" ? out.returned.slice(0, 300) : out.returned);
  cid = returnedJson(out)?.challenge_id;
}
out = await dev.send("respond", [cid, "Our listing is correct: location is only used when the user opts in to nearby features.", ""], HALF);
console.log("respond", out.status, out.seconds, JSON.stringify(returnedJson(out)).slice(0, 300));
out = await trg.send("judge", [cid]);
console.log("judge", out.status, out.seconds, out.hash, JSON.stringify(returnedJson(out)).slice(0, 600));
console.log(out.stderr.slice(-1500));
const v = await trg.view("get_challenge", [cid]);
console.log(JSON.stringify(v).slice(0, 1500));
