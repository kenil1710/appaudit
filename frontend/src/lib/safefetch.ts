/**
 * Server-side fetch with an address guard (fix 10). A name-only host check is
 * bypassed by a DNS name that resolves to a private address or by a redirect,
 * so this resolves every hop and follows redirects by hand:
 *   - the host's every resolved address must be public (no loopback, private,
 *     link-local, CGNAT, unique-local, multicast, unspecified, v4-mapped
 *     private, or documentation ranges);
 *   - redirects are `manual` and followed only to the SAME host, re-checked;
 *   - nothing about a refused hop (status, headers, body) is returned.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function v4Private(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 88) ||
    (a === 198 && b === 51) || (a === 203 && b === 0) || a >= 224;
}

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return v4Private(ip);
  if (kind !== 6) return true;
  const low = ip.toLowerCase();
  if (low === "::" || low === "::1") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(low);
  if (mapped) return v4Private(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(low) || low.startsWith("64:ff9b:") || low.startsWith("2001:db8");
}

export async function hostIsPublic(host: string): Promise<boolean> {
  if (!host || host === "localhost" || /\.(local|internal|localhost)$/i.test(host)) return false;
  if (isIP(host)) return false;                     // literal IPs are never fetched
  try {
    const addrs = await lookup(host, { all: true, verbatim: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Fetch `url` as text, only on its own host, public addresses only.
 *  Returns null on ANY refusal or failure - never a status to echo. */
export async function guardedText(url: string, maxBytes = 3_000_000): Promise<string | null> {
  let current: URL;
  try { current = new URL(url); } catch { return null; }
  if (current.protocol !== "https:" && current.protocol !== "http:") return null;
  const host = current.hostname.toLowerCase();
  for (let hop = 0; hop < 4; hop++) {
    if (current.hostname.toLowerCase() !== host) return null;
    if (!(await hostIsPublic(host))) return null;
    let res: Response;
    try {
      res = await fetch(current, {
        headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
        redirect: "manual", signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try { current = new URL(loc, current); } catch { return null; }
      continue;
    }
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, maxBytes);
  }
  return null;
}
