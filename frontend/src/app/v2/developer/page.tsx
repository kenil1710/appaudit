"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Copy, FileKey2, History, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TxButton } from "@/components/TxButton";
import { useWallet } from "@/components/WalletProvider";
import { DevBadge } from "@/components/V2";
import { ErrorState } from "@/components/States";
import { useDeveloper } from "@/lib/hooks2";
import { duration, short, when } from "@/lib/format";
import { tx2 } from "@/lib/v2";

type Listing = { key?: string; title?: string; developer?: string; website?: string; host?: string; file_url?: string; error?: string };

function Developer() {
  const params = useSearchParams();
  const { account } = useWallet();
  const [input, setInput] = useState(params.get("app") ?? "https://play.google.com/store/apps/details?id=com.snapchat.android");
  const [url, setUrl] = useState<string | null>(params.get("app") ? input : null);
  const { data: dev, error, mutate } = useDeveloper(url);
  const [listing, setListing] = useState<Listing | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    setListing(null);
    fetch(`/api/listing?url=${encodeURIComponent(url)}`).then((r) => r.json()).then(setListing).catch(() => setListing({ error: "could not read the listing" }));
  }, [url]);

  const key = dev?.app_key ?? listing?.key ?? "";
  const content = `appaudit-verify ${key}\n${account ?? "<connect your wallet to fill this line>"}\n`;
  const now = Date.now() / 1000;
  const cooling = dev && dev.next_change_at > now;

  return (
    <AppShell eyebrow="AppAudit v2" title="Verified developer"
      blurb="Prove you control an app's own website. Validators read the developer website OFF THE STORE LISTING — never from you — and fetch /.well-known/appaudit.txt there. Once verified, only your wallet can respond to or contest cases about that listing.">
      <div className="glass panel" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input className="input" style={{ flex: 1, minWidth: 240 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Google Play or App Store listing URL" />
        <button className="btn btn-primary" onClick={() => setUrl(input.trim())}><Search size={15} /> Look up</button>
      </div>
      {error && <ErrorState detail={error.message} />}
      {url && dev && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="glass panel" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="eyebrow">{dev.app_key}</div>
              <div style={{ marginTop: 8 }}>
                {dev.verified && dev.current ? <DevBadge verified label={`verified developer ${short(dev.current.wallet)}`} /> : <DevBadge verified={false} label="no verified developer — cases show “respondent unverified”" />}
              </div>
            </div>
            {dev.verified && (
              <TxButton className="btn btn-ghost" label="Recheck (anyone)" icon={<RefreshCw size={15} />} waitingLabel="Validators re-reading the listing and file…"
                run={(a) => tx2.recheck(a, url)} onDone={() => void mutate()} />
            )}
          </div>

          <div className="split">
            <div className="glass panel" style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}><FileKey2 size={14} /> 1 · Publish this file</div>
              {listing?.error && <span style={{ color: "var(--hot)" }}>{listing.error}</span>}
              {listing && !listing.error && (listing.file_url ? (<>
                <div>
                  <div className="label">the listing&apos;s developer website (read the way validators read it)</div>
                  <span className="hash" style={{ overflowWrap: "anywhere" }}>{listing.website}</span>
                </div>
                <div>
                  <div className="label">so validators will fetch exactly</div>
                  <span className="hash" style={{ overflowWrap: "anywhere", color: "var(--cyan)" }}>{listing.file_url}</span>
                </div>
              </>) : <span style={{ color: "var(--hot)" }}>This listing publishes no developer website, so it cannot be verified.</span>)}
              {!listing && <span className="muted">Reading the listing…</span>}
              <div className="label">file content (plain text; the wallet line is what is checked)</div>
              <pre className="privacy" style={{ margin: 0 }}>{content}</pre>
              <button className="btn btn-sm btn-ghost" style={{ justifySelf: "start" }} disabled={!account}
                onClick={() => { void navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                <Copy size={14} /> {copied ? "Copied" : "Copy file content"}
              </button>
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                It must answer HTTP 200 and contain your full 42-character address standing alone. A page that answers every path (a single-page site) is read as a file that does not name you.
              </p>
            </div>
            <div className="glass panel" style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}><BadgeCheck size={14} /> 2 · Register</div>
              <p className="dim" style={{ margin: 0, fontSize: "0.88rem" }}>
                One transaction, no pending state: validators fetch the listing and the file, and either record you or refuse with the reason. Re-verification (a changed file, a new wallet) is allowed once per cooldown; history is kept.
              </p>
              {cooling && <span className="chip" style={{ color: "var(--amber)", justifySelf: "start" }}>next identity change in {duration(dev.next_change_at - now)}</span>}
              <TxButton label="Register as developer" icon={<BadgeCheck size={16} />} waitingLabel="Validators fetching the file…"
                disabled={!listing?.file_url} run={(a) => tx2.register(a, url)} onDone={() => void mutate()} />
            </div>
          </div>

          <div className="glass panel">
            <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><History size={14} /> History</div>
            {dev.history.length === 0 && <p className="muted" style={{ margin: 0 }}>No identity events for this listing yet.</p>}
            <div style={{ display: "grid", gap: 8 }}>
              {dev.history.map((h, i) => (
                <div key={i} className="mono" style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: "0.8rem", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 10 }}>
                  <span style={{ color: h.status === "VERIFIED" ? "var(--green)" : "var(--hot)" }}>{h.status}</span>
                  <span>{short(h.wallet)}</span><span className="muted">{h.host}</span><span className="muted">{when(h.at)}</span>
                  <span className="dim" style={{ overflowWrap: "anywhere" }}>{h.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function DeveloperPage() {
  return <Suspense fallback={null}><Developer /></Suspense>;
}
