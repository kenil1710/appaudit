/**
 * Server-side mirrors of three pure functions in contracts/AppAuditV2.py, used
 * ONLY for display: `_qnorm` + `_fnv` (to locate a policy quote the chain
 * stores as a hash), and `_listing_meta` / `_full_host` (to show a developer
 * the exact identity-file URL validators will fetch). The chain never trusts
 * these; they let the page show what the chain already decided.
 */

import { createHash } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

export function qnorm(s: string): string {
  let out = "";
  for (const ch of s) {
    if ("‘’‛′".includes(ch)) out += "'";
    else if ("“”„″".includes(ch)) out += '"';
    else if ("‐‑‒–—―".includes(ch)) out += "-";
    else if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") out += " ";
    else out += ch;
  }
  return out.split(/\s+/).filter(Boolean).join(" ");
}

export const quoteHash = (q: string) => sha256("quote|" + qnorm(q));

const OPENERS = "\"'([“‘•-*";

/** Mirror of the contract's `_policy_sentences`. */
export function policySentences(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = qnorm(raw);
    if (!line) continue;
    let start = 0;
    let i = 0;
    const n = line.length;
    while (i < n) {
      if (".!?".includes(line[i])) {
        let j = i + 1;
        while (j < n && "\"')]”’".includes(line[j])) j++;
        if (j >= n) break;
        const next = line[j + 1] ?? "";
        if (line[j] === " " && j + 1 < n && (/^[\p{Lu}\p{Nd}]$/u.test(next) || OPENERS.includes(next))) {
          const piece = line.slice(start, j).trim();
          if (piece) out.push(piece);
          start = j + 1;
          i = j + 1;
          continue;
        }
      }
      i++;
    }
    const piece = line.slice(start).trim();
    if (piece) out.push(piece);
  }
  return out;
}

/** The whole-sentence run (1 to 3 sentences) whose quote hash matches. */
export function findQuote(text: string, hash: string, len: number): string | null {
  const s = policySentences(text);
  for (let k = 1; k <= 3; k++) {
    for (let i = 0; i + k <= s.length; i++) {
      const run = s.slice(i, i + k).join(" ");
      if (run.length === len && quoteHash(run) === hash) return run;
    }
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', "#39": "'", "#x27": "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–" };

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#?[a-z0-9]+);/gi, (m, e: string) => {
      const k = e.toLowerCase();
      if (ENTITIES[k]) return ENTITIES[k];
      if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10));
      return m;
    });
}

export function fullHost(url: string): string {
  const m = /^https?:\/\/([^/?#:]+)/i.exec(url.trim());
  if (!m) return "";
  const host = m[1].toLowerCase();
  if (host.includes("@") || !host.includes(".") || !/^[a-z0-9.-]+$/.test(host)) return "";
  const tld = host.slice(host.lastIndexOf(".") + 1);
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) return "";
  if (host === "localhost" || /\.(local|internal|localhost)$/.test(host)) return "";
  return host;
}

export function parseListing(url: string): { platform: string; appId: string; metaUrl: string; key: string } | null {
  const u = url.trim();
  const play = /^https?:\/\/(www\.)?play\.google\.com\/store\/apps\/(details|datasafety)\?(.*&)?id=([A-Za-z0-9._]+)/i.exec(u);
  if (play) {
    return { platform: "google_play", appId: play[4], key: `google_play:${play[4]}`,
      metaUrl: `https://play.google.com/store/apps/details?id=${play[4]}&hl=en&gl=US` };
  }
  const apple = /^https?:\/\/(www\.)?apps\.apple\.com\/[^?#]*?\/app\/(?:([a-z0-9-]+)\/)?id(\d{1,15})/i.exec(u);
  if (apple) {
    const slug = apple[2] ? `${apple[2].toLowerCase()}/` : "";
    return { platform: "app_store", appId: apple[3], key: `app_store:${apple[3]}`,
      metaUrl: `https://apps.apple.com/us/app/${slug}id${apple[3]}` };
  }
  return null;
}

function attr(tag: string, name: string): string {
  const m = new RegExp(` ${name}="([^"]*)"`).exec(tag);
  return m ? m[1].replace(/&amp;/g, "&") : "";
}

export function listingMeta(platform: string, html: string) {
  const out = { title: "", developer: "", website: "", policy: "" };
  const anchors: { href: string; inner: string; aria: string }[] = [];
  const re = /<a ([^>]*)>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && anchors.length < 4000) {
    anchors.push({ href: attr(" " + m[1], "href"), inner: m[2].replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).join(" "), aria: attr(" " + m[1], "aria-label") });
  }
  const web = (h: string) => /^https?:\/\//i.test(h) && h.length <= 300 && !h.includes(" ");
  if (platform === "google_play") {
    const t = /itemprop="name">([^<]*)</.exec(html);
    out.title = t ? t[1] : "";
    for (const a of anchors) {
      if (!out.developer && /^\/store\/apps\/dev(eloper)?\?id=/.test(a.href)) out.developer = a.inner;
      if (!out.website && a.aria.startsWith("Website ") && web(a.href)) out.website = a.href;
      if (!out.policy && a.aria.startsWith("Privacy Policy ") && web(a.href)) out.policy = a.href;
    }
  } else {
    const t = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
    out.title = t ? t[1].replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).join(" ") : "";
    const s = />Seller<\/dt>([\s\S]*?)<\/dd>/.exec(html);
    out.developer = s ? s[1].replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).join(" ") : "";
    for (const a of anchors) {
      if (!out.website && a.inner === "Developer Website" && !a.aria && web(a.href)) out.website = a.href;
      if (!out.policy && (a.aria === "Developer’s Privacy Policy" || a.aria === "Developer's Privacy Policy") && web(a.href)) out.policy = a.href;
    }
  }
  return out;
}
