import { NextResponse } from "next/server";
import { fullHost, listingMeta, parseListing } from "@/lib/mirror";

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
    const res = await fetch(app.metaUrl, {
      headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", "accept-language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(15_000),
    });
    const meta = listingMeta(app.platform, (await res.text()).slice(0, 3_000_000));
    const host = fullHost(meta.website);
    return NextResponse.json({ ...app, ...meta, host, file_url: host ? `https://${host}/.well-known/appaudit.txt` : "" });
  } catch (e) {
    return NextResponse.json({ ...app, error: String(e instanceof Error ? e.message : e).slice(0, 120) });
  }
}
