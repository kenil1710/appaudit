import type { Platform, Verdict } from "./types";

/** Wei (as a decimal string) to a short GEN string, by integer arithmetic. */
export function gen(wei: string | number | bigint | undefined, digits = 3): string {
  let n: bigint;
  try {
    n = BigInt(wei ?? 0);
  } catch {
    return "0";
  }
  const neg = n < 0n;
  if (neg) n = -n;
  const whole = n / 10n ** 18n;
  const frac = (n % 10n ** 18n).toString().padStart(18, "0").slice(0, digits).replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}

export function toWei(text: string): bigint | null {
  const t = text.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  return BigInt(w) * 10n ** 18n + BigInt((f + "0".repeat(18)).slice(0, 18));
}

export function short(addr: string | undefined): string {
  if (!addr) return "";
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export const ZERO = "0x0000000000000000000000000000000000000000";

export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60 ? `${s % 60}s` : ""}`.trim();
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

export function when(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ago(ts: number, now = Date.now() / 1000): string {
  if (!ts) return "—";
  const d = now - ts;
  return d >= 0 ? `${duration(d)} ago` : `in ${duration(-d)}`;
}

export const VERDICT_LABEL: Record<string, string> = {
  CONTRADICTED: "Contradicted",
  CLAIM_VERIFIED: "Verified",
  INCONCLUSIVE: "Inconclusive",
};

export const VERDICT_COLOR: Record<string, string> = {
  CONTRADICTED: "var(--hot)",
  CLAIM_VERIFIED: "var(--green)",
  INCONCLUSIVE: "var(--grey)",
};

export function verdictColor(v: Verdict | string): string {
  return VERDICT_COLOR[v] ?? "var(--amber)";
}

export const STATUS_LABEL: Record<string, string> = {
  FILED: "Awaiting response",
  RESPONDED: "Awaiting judgment",
  SETTLED: "Contest window",
  FINALIZED: "Final",
  DEFAULTED: "Defaulted",
  WITHDRAWN: "Withdrawn",
  STALLED: "Stalled · refunded",
};

export const PLATFORM_LABEL: Record<Platform | "", string> = {
  google_play: "Google Play",
  app_store: "App Store",
  "": "Unknown",
};

/** Friendly names for well-known apps. Anything else shows its package or slug. */
const KNOWN: Record<string, string> = {
  "google_play:com.whatsapp": "WhatsApp",
  "google_play:com.spotify.music": "Spotify",
  "google_play:com.zhiliaoapp.musically": "TikTok",
  "google_play:com.facebook.katana": "Facebook",
  "google_play:org.telegram.messenger": "Telegram",
  "google_play:com.snapchat.android": "Snapchat",
  "google_play:com.instagram.android": "Instagram",
  "app_store:389801252": "Instagram",
  "app_store:310633997": "WhatsApp",
  "app_store:324684580": "Spotify",
  "google_play:com.facebook.orca": "Messenger",
  "google_play:com.lemon.lvoverseas": "CapCut",
  "app_store:1500855883": "CapCut",
  "app_store:447188370": "Snapchat",
  "google_play:com.einnovation.temu": "Temu",
  "app_store:429047995": "Pinterest",
  "app_store:284882215": "Facebook",
};

export function appName(key: string, label: string): string {
  if (KNOWN[key]) return KNOWN[key];
  // Package ids end in generic words (com.linkedin.android, com.reddit.frontpage);
  // the brand is the last segment that is not one of them.
  const GENERIC = new Set(["android", "app", "apps", "mobile", "frontpage", "client", "main", "prod", "release", "katana", "orca"]);
  const segs = label.split(".").filter(Boolean);
  let pick = segs[segs.length - 1] ?? label;
  for (let i = segs.length - 1; i >= 1; i--) {
    if (!GENERIC.has(segs[i].toLowerCase())) { pick = segs[i]; break; }
  }
  const base = /^id\d+$/.test(label) ? label : pick;
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function storeUrl(key: string, fetchUrl?: string): string {
  if (key.startsWith("google_play:")) {
    return `https://play.google.com/store/apps/details?id=${key.slice("google_play:".length)}`;
  }
  return fetchUrl ?? `https://apps.apple.com/us/app/id${key.slice("app_store:".length)}`;
}

/** Auto-detect a platform from what the user is typing, for the form badge. */
export function detectPlatform(url: string): Platform | "" {
  const low = url.trim().toLowerCase();
  if (/(^|\/\/|www\.)play\.google\.com\//.test(low)) return "google_play";
  if (/(^|\/\/|www\.)apps\.apple\.com\//.test(low)) return "app_store";
  return "";
}

export const AXIS_LABEL: Record<string, string> = {
  collect: "collection",
  share: "sharing with other companies",
  track: "tracking",
};

export const CASE_LABEL: Record<string, string> = {
  DIRECT: "The listing declares the claimed data type on the claimed axis",
  EXPLICIT_NONE: "The listing explicitly declares no data on that axis",
  ELSEWHERE: "The data type appears, but on a different axis",
  ABSENT: "The listing never mentions the claimed data type",
  UNREADABLE: "No privacy section could be read",
};
