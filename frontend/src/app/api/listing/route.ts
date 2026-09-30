import { NextResponse } from "next/server";
import { fullHost, listingMeta, parseListing } from "@/lib/mirror";
import { guardedText } from "@/lib/safefetch";

export const runtime = "nodejs";
export const revalidate = 600;

/** GET /api/listing?url= — what the listing says about its developer, read
 *  the way validators read it, so the registration page can name the exact
 *  identity-file URL before anyone stakes gas on it. Display only. */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  const app = parseListing(url);
  if (!app) return NextResponse.json({ error: "not a Google Play or App Store listing URL" }, { status: 400 });
  try {
    // The URL is rebuilt from the app id on the store's own host; fetched
    // through the same guard as every server-side fetch (fix 10).
    const html = await guardedText(app.metaUrl);
    if (html === null) return NextResponse.json({ ...app, error: "the listing could not be read" });
    const meta = listingMeta(app.platform, html);
    const host = fullHost(meta.website);
    return NextResponse.json({ ...app, ...meta, host, file_url: host ? `https://${host}/.well-known/appaudit.txt` : "" });
  } catch (e) {
    return NextResponse.json({ ...app, error: String(e instanceof Error ? e.message : e).slice(0, 120) });
  }
}
