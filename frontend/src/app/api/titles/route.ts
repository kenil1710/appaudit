import { NextResponse } from "next/server";
import { listingMeta } from "@/lib/mirror";
import { guardedText } from "@/lib/safefetch";

export const runtime = "nodejs";
export const revalidate = 86400;

const KEY = /^(google_play:[A-Za-z0-9._]{3,150}|app_store:\d{1,15})$/;

function metaUrl(key: string): { platform: string; url: string } {
  if (key.startsWith("google_play:")) {
    return { platform: "google_play", url: `https://play.google.com/store/apps/details?id=${key.slice(12)}&hl=en&gl=US` };
  }
  return { platform: "app_store", url: `https://apps.apple.com/us/app/id${key.slice(10)}` };
}

/** GET /api/titles?keys=google_play:com.linkedin.android,app_store:447188370
 *  The store's own title for each app key, read from the listing page the way
 *  validators read it (display only; URLs are rebuilt from the key on the
 *  store's host, fetched through the guard). At most 30 keys. */
export async function GET(req: Request) {
  const keys = (new URL(req.url).searchParams.get("keys") ?? "").split(",").filter((k) => KEY.test(k)).slice(0, 30);
  const out: Record<string, string> = {};
  await Promise.all(keys.map(async (k) => {
    const { platform, url } = metaUrl(k);
    const html = await guardedText(url);
    if (html === null) return;
    const title = listingMeta(platform, html).title.replace(/&amp;/g, "&").trim();
    if (title) out[k] = title;
  }));
  return NextResponse.json(out, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
