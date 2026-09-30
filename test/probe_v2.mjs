/**
 * v2 measurement: renders/GETs a batch of URLs through real Studio Dev
 * validators, using several probe instances in parallel (a node holds one
 * transaction slot per recipient contract), and writes each capture to
 * docs/probe/v2/<mode>__<slug>.txt.
 *
 *   node probe_v2.mjs --jobs=jobs.json [--instances=4]
 *   jobs.json: [{"url": "...", "mode": "text"|"html"|"get"}, ...]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { connect, deploy, fundOnStudio, argOf, estimateFees } from "./harness.mjs";

const jobs = JSON.parse(readFileSync(argOf("jobs"), "utf8"));
const n = Number(argOf("instances", "4"));
const roles = ["advocate1", "advocate2", "advocate3", "advocate4", "advocate5", "advocate6", "dev1", "dev2"];
const regPath = new URL("./.probe_v2.json", import.meta.url);
const reg = existsSync(regPath) ? JSON.parse(readFileSync(regPath, "utf8")) : { addresses: [] };
const base = connect({ address: "0x0000000000000000000000000000000000000000", role: "client" });
await fundOnStudio(base.chain, base.account.address, 500n * 10n ** 18n);
const code = readFileSync(new URL("../contracts/_probe_v2.py", import.meta.url));
while (reg.addresses.length < n) {
  const res = await deploy({ chain: base.chain, wallet: base.wallet, read: base.read, code, args: [], label: "probe_v2 deploy" });
  if (!res.ok) { console.error("deploy failed", res.out?.status, String(res.out?.stderr).slice(-1500)); process.exit(1); }
  reg.addresses.push(res.address);
  writeFileSync(regPath, JSON.stringify(reg, null, 2));
  console.log("probe_v2 at", res.address);
}
const outDir = new URL("../docs/probe/v2/", import.meta.url);
mkdirSync(outDir, { recursive: true });
const slug = (u) => u.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 100);
const queue = jobs.filter((j) => argOf("force") || !existsSync(new URL(`${j.mode}__${slug(j.url)}.txt`, outDir)));
console.log(`${queue.length} jobs over ${n} instances`);

async function fresh() {
  const res = await deploy({ chain: base.chain, wallet: base.wallet, read: base.read, code, args: [], label: "probe_v2 redeploy" });
  return res.ok ? res.address : null;
}

async function worker(i) {
  let c = connect({ address: reg.addresses[i], role: roles[i % roles.length] });
  await fundOnStudio(c.chain, c.account.address, 200n * 10n ** 18n);
  while (queue.length) {
    const j = queue.shift();
    const t0 = Date.now();
    j.tries = (j.tries ?? 0) + 1;
    console.log(`[${i}] start ${j.mode} ${j.url}`);
    const out = await c.send("probe", [j.url, j.mode], 0n, { fees: await estimateFees(c.wallet, "probe") });
    const key = `${j.mode}|${j.url}`;
    let text = "";
    let meta = "";
    try {
      for (let start = 0; ; start += 30000) {
        const w = JSON.parse(await c.view("window", [key, start, 30000]));
        meta = w.meta;
        text += w.text;
        if (start + 30000 >= w.stored) break;
      }
    } catch (e) { meta = "read failed " + e.message; }
    if (!meta) {
      console.log(`[${i}] ${j.mode} ${j.url} ${out.status} leader crashed (try ${j.tries})`);
      if (j.tries < 4) queue.push(j);
      // A crashed leader jams this instance's queue (measured): move on.
      const addr = await fresh();
      if (addr) { reg.addresses[i] = addr; writeFileSync(regPath, JSON.stringify(reg, null, 2)); c = connect({ address: addr, role: roles[i % roles.length] }); }
      continue;
    }
    writeFileSync(new URL(`${j.mode}__${slug(j.url)}.txt`, outDir), `#META ${meta}\n#TX ${out.hash}\n${text}`);
    console.log(`[${i}] ${j.mode} ${j.url} ${out.status} ${((Date.now() - t0) / 1000).toFixed(0)}s ${meta}`);
  }
}
await Promise.all(Array.from({ length: n }, (_, i) => worker(i)));
