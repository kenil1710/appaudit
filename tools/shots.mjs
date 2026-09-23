/**
 * Screenshots of the site plus a console-error and horizontal-scroll audit at
 * desktop (1440px) and phone (390px) width.
 *
 *   BASE=http://localhost:3000 node tools/shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "https://appaudit-genlayer.vercel.app";
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PAGES = [
  ["landing", "/"],
  ["challenge", "/challenge"],
  ["challenges", "/challenges"],
  ["detail-1", "/challenge/1"],
  ["detail-4", "/challenge/4"],
  ["apps", "/apps"],
  ["docs", "/docs"],
];
const problems = [];
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
for (const [width, height, tag] of [[1440, 900, "desktop"], [390, 844, "mobile"]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90_000 });
    // Scroll through once so every scroll-reveal section has rendered.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}${tag}-${name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`${tag} ${path}: scrolls ${overflow}px sideways`);
    const real = errors.filter((e) => !/rate limit|429|ERR_INTERNET_DISCONNECTED/i.test(e));
    if (real.length) problems.push(`${tag} ${path}: ${real.slice(0, 3).join(" | ")}`);
    console.log(`  ${tag.padEnd(7)} ${path.padEnd(14)} overflow=${overflow}px errors=${real.length}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
if (problems.length) {
  console.log("PROBLEMS:");
  for (const p of problems) console.log("  ✘ " + p);
  process.exit(1);
}
console.log("✔ no console errors and no horizontal scroll at 1440px or 390px");
