import { NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { findQuote, fullHost, htmlToText } from "@/lib/mirror";
import { guardedText } from "@/lib/safefetch";
import { plain } from "@/lib/contract";
import { V2_ADDRESS } from "@/lib/v2";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * GET /api/quote?id=<case>&which=filing|judgment
 *
 * NOT a fetch relay (fix 9): the only URL this route fetches is the policy URL
 * the CONTRACT stored for that case, on that URL's own host, public addresses
 * only, redirects followed by hand to the same host (lib/safefetch.ts). It
 * finds the whole-sentence run whose SHA-256 the contract stored and returns
 * it, or a fixed "not located" - never a status, a header or a body.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = Number(q.get("id") ?? "0");
  const which = q.get("which") === "judgment" ? "judgment" : "filing";
  if (!Number.isInteger(id) || id < 1 || id > 1_000_000) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  let c: Record<string, unknown>;
  try {
    const client = createClient({ chain: studioDevnet });
    c = plain(await client.readContract({ address: V2_ADDRESS, functionName: "get_case", args: [id] as never })) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "the case could not be read" });
  }
  const filing = (c.filing ?? {}) as Record<string, unknown>;
  const ev = (c[which] ?? {}) as Record<string, unknown>;
  const url = String(filing.policy_url ?? "");
  const hash = String(ev.quote_hash ?? "");
  const len = Number(ev.quote_len ?? 0);
  if (c.kind !== "POLICY_LABEL" || !fullHost(url) || !/^[0-9a-f]{64}$/.test(hash) || !(len > 0)) {
    return NextResponse.json({ error: "this case stores no policy quote" });
  }
  const html = await guardedText(url);
  if (html === null) return NextResponse.json({ error: "not located in the live policy" });
  const quote = findQuote(htmlToText(html), hash, len);
  return quote ? NextResponse.json({ quote, policy_url: url }) : NextResponse.json({ error: "not located in the live policy" });
}
