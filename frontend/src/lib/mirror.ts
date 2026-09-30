/**
 * Server-side mirrors of three pure functions in contracts/AppAuditV2.py, used
 * ONLY for display: `_qnorm` + `_fnv` (to locate a policy quote the chain
 * stores as a hash), and `_listing_meta` / `_full_host` (to show a developer
 * the exact identity-file URL validators will fetch). The chain never trusts
 * these; they let the page show what the chain already decided.
 */

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK = 0xffffffffffffffffn;

export function fnv(s: string): string {
  let h = FNV_OFFSET;
  for (const ch of s) {
    h ^= BigInt(ch.codePointAt(0) ?? 0);
    h = (h * FNV_PRIME) & MASK;
  }
  return h.toString(16).padStart(16, "0");
}

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

export const quoteHash = (q: string) => fnv("quote|" + qnorm(q));

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

/** Every word start in the normalised text is a candidate quote start. */
export function findQuote(text: string, hash: string, len: number): string | null {
  const t = qnorm(text);
  const chars = Array.from(t);
  for (let i = 0; i + len <= chars.length; i++) {
    if (i > 0 && chars[i - 1] !== " ") continue;
    if (chars[i] === " ") continue;
    const cand = chars.slice(i, i + len).join("");
    if (fnv("quote|" + cand) === hash) return cand;
  }
  return null;
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
