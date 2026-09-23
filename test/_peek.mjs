import { readFileSync } from "node:fs";
import { connect } from "./harness.mjs";
const dep = JSON.parse(readFileSync(new URL("../deployments.json", import.meta.url))).deployments.studiodev;
const c = connect({ address: process.env.ADDR ?? dep.AppAuditDemo.address, role: "trigger" });
const [m, ...a] = process.argv.slice(2);
const v = await c.view(m, a.map((x) => (/^\d+$/.test(x) ? Number(x) : x)));
console.log(typeof v === "string" ? v : JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x instanceof Map ? Object.fromEntries(x) : x), 1));
