import { NextResponse } from "next/server";
import { findQuote, fullHost, htmlToText } from "@/lib/mirror";

export const runtime = "nodejs";
export const revalidate = 3600;

/** GET /api/quote?url=&hash=&len= — locate the sentence whose hash the chain
 *  stores, in the live policy. Returns {quote} or {error}; never invents one. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const url = q.get("url") ?? "";
  const hash = (q.get("hash") ?? "").toLowerCase();
  const len = Number(q.get("len") ?? "0");
  if (!fullHost(url) || !/^[0-9a-f]{16}$/.test(hash) || !(len >= 20 && len <= 400)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", "accept-language": "en-US,en;q=0.9" },
      redirect: "follow", signal: AbortSignal.timeout(15_000),
    });
    const html = (await res.text()).slice(0, 3_000_000);
    const quote = findQuote(htmlToText(html), hash, len);
    return quote ? NextResponse.json({ quote }) : NextResponse.json({ error: `no sentence with that hash in the live page (HTTP ${res.status})` });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 120) });
  }
}
