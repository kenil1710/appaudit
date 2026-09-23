"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Apple, ArrowRight, Coins, ExternalLink, Eye, Info, Link2, ShieldCheck, ShieldPlus, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TxButton } from "@/components/TxButton";
import { fileChallenge, previewClaim, getByAdvocate } from "@/lib/contract";
import { useConfig } from "@/lib/hooks";
import { AXIS_LABEL, detectPlatform, duration, gen, PLATFORM_LABEL, toWei } from "@/lib/format";
import { useWallet } from "@/components/WalletProvider";
import type { Preview } from "@/lib/types";

const EXAMPLES = [
  { url: "https://play.google.com/store/apps/details?id=com.whatsapp", claim: "This app does not collect location data" },
  { url: "https://apps.apple.com/us/app/instagram/id389801252", claim: "This app does not track your contact info" },
  { url: "https://play.google.com/store/apps/details?id=com.spotify.music", claim: "This app does not share location with third parties" },
];

export default function ChallengePage() {
  const { data: config } = useConfig();
  const { account } = useWallet();
  const [url, setUrl] = useState("");
  const [claim, setClaim] = useState("");
  const [stake, setStake] = useState("0.5");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [filedId, setFiledId] = useState<number | null>(null);

  const platform = detectPlatform(url);
  const minWei = BigInt(config?.min_stake_wei ?? "500000000000000000");
  const stakeWei = toWei(stake);
  const stakeOk = stakeWei !== null && stakeWei >= minWei;
  const claimLen = claim.trim().length;

  useEffect(() => {
    setPreview(null);
    setPreviewError("");
    if (!url.trim() || claimLen < 5) return;
    const t = setTimeout(() => {
      previewClaim(url.trim(), "", claim.trim())
        .then(setPreview)
        .catch(() => setPreviewError("The preview could not be read from the chain right now."));
    }, 600);
    return () => clearTimeout(t);
  }, [url, claim, claimLen]);

  const blockers = useMemo(() => {
    const out: string[] = [];
    if (!platform && url.trim()) out.push("Only Google Play and App Store listing URLs can be audited.");
    if (claimLen && (claimLen < 20 || claimLen > 500)) out.push("The claim must be 20 to 500 characters.");
    if (!stakeOk) out.push(`The stake must be at least ${gen(minWei.toString())} GEN.`);
    return out;
  }, [platform, url, claimLen, stakeOk, minWei]);

  const ready = Boolean(preview?.ok) && blockers.length === 0;

  return (
    <AppShell
      eyebrow="File a challenge"
      title="Challenge an app's privacy claim"
      blurb="Name the listing and the claim. Before you stake, the contract shows you exactly which page validators will render and how it reads your claim."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, alignItems: "start" }}>
        <div className="glass panel" style={{ display: "grid", gap: 20 }}>
          <div>
            <label className="label" htmlFor="url"><Link2 size={12} style={{ verticalAlign: -1 }} /> Store listing URL</label>
            <div style={{ position: "relative" }}>
              <input id="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=…" style={{ paddingRight: 128 }} />
              <AnimatePresence>
                {platform && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="chip"
                    style={{ position: "absolute", right: 8, top: 8, color: platform === "app_store" ? "var(--text)" : "var(--green)" }}>
                    {platform === "app_store" ? <Apple size={13} /> : <Smartphone size={13} />} {PLATFORM_LABEL[platform]}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="claim"><ShieldCheck size={12} style={{ verticalAlign: -1 }} /> The claim being tested</label>
            <textarea id="claim" className="textarea" value={claim} maxLength={520} onChange={(e) => setClaim(e.target.value)} placeholder="This app claims it does not…  e.g. This app does not collect location data" />
            <div className="mono" style={{ fontSize: "0.72rem", marginTop: 6, color: claimLen && (claimLen < 20 || claimLen > 500) ? "var(--hot)" : "var(--muted)" }}>
              {claimLen}/500 · name a data type the listing declares (location, contacts, photos, browsing history…)
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLES.map((ex) => (
              <button key={ex.url} className="btn btn-sm btn-ghost" onClick={() => { setUrl(ex.url); setClaim(ex.claim); }}>
                Try: {ex.claim.slice(0, 32)}…
              </button>
            ))}
          </div>

          <div>
            <label className="label" htmlFor="stake"><Coins size={12} style={{ verticalAlign: -1 }} /> Your stake (GEN)</label>
            <input id="stake" className="input" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} />
            <div className="mono muted" style={{ fontSize: "0.72rem", marginTop: 6 }}>minimum {gen(minWei.toString())} GEN</div>
          </div>

          <div className="glass" style={{ padding: 14, fontSize: "0.84rem", display: "grid", gap: 6, background: "rgba(8,8,15,.5)" }}>
            <div className="mono" style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-2)" }}><Info size={14} /> Fees and outcomes</div>
            <div>Contradicted → you get your stake back + <b>80%</b> of the developer&apos;s stake. 10% protocol, 10% stays with them.</div>
            <div>Verified → the developer gets 80% of <b>your</b> stake; 10% protocol, 10% back to you.</div>
            <div>Inconclusive → both stakes back in full. No response in {duration(config?.response_window_s ?? 172800)} → you win by default, stake back.</div>
            <div className="muted">You can withdraw with a full refund until someone responds. Network fees are paid separately.</div>
          </div>

          {blockers.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {blockers.map((b) => (
                <div key={b} style={{ display: "flex", gap: 8, color: "var(--hot)", fontSize: "0.84rem" }}><AlertTriangle size={14} style={{ marginTop: 3 }} /> {b}</div>
              ))}
            </div>
          )}

          {filedId ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass" style={{ padding: 18, textAlign: "center", borderColor: "var(--cyan)" }}>
              <motion.div initial={{ rotate: -20, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                <ShieldPlus size={42} color="var(--cyan)" style={{ filter: "drop-shadow(0 0 16px rgba(0,229,255,.7))" }} />
              </motion.div>
              <div className="mono" style={{ fontWeight: 700, marginTop: 8 }}>Challenge #{filedId} filed</div>
              <Link href={`/challenge/${filedId}`} className="btn btn-primary" style={{ marginTop: 12 }}>Open challenge <ArrowRight size={15} /></Link>
            </motion.div>
          ) : (
            <TxButton
              label="Stake and file challenge"
              icon={<ShieldPlus size={16} />}
              disabled={!ready}
              waitingLabel="Filing on chain…"
              run={(acc) => fileChallenge(acc, { url: url.trim(), platform: "", claim: claim.trim(), stakeWei: stakeWei ?? 0n })}
              onDone={async (r) => {
                if (r.status !== "OK") return;
                const id = Number(r.challenge_id);
                if (id) return setFiledId(id);
                if (account) {
                  const mine = await getByAdvocate(account).catch(() => null);
                  const last = mine?.items?.[mine.items.length - 1];
                  if (last) setFiledId(last.challenge_id);
                }
              }}
            />
          )}
        </div>

        <div className="glass panel" style={{ display: "grid", gap: 16 }}>
          <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}><Eye size={14} /> What validators will see</div>
          {!preview && !previewError && (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>Enter a listing URL and a claim to preview how the contract reads them. Nothing is sent until you stake.</p>
          )}
          {previewError && <p style={{ color: "var(--hot)", margin: 0 }}>{previewError}</p>}
          {preview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "grid", gap: 14 }}>
              <div>
                <div className="label">Page every validator renders</div>
                {preview.fetch_url ? (
                  <a href={preview.fetch_url} target="_blank" rel="noreferrer" className="hash" style={{ display: "inline-flex", gap: 6, color: "var(--cyan)" }}>
                    {preview.fetch_url} <ExternalLink size={12} />
                  </a>
                ) : <span className="muted">—</span>}
                <p className="muted" style={{ fontSize: "0.8rem", margin: "6px 0 0" }}>
                  Rebuilt from the app id, never forwarded from your URL. Google Play is read from its full <b>data safety</b> page; the App Store from the US storefront&apos;s App Privacy label.
                </p>
              </div>
              <div>
                <div className="label">How the claim is read</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span className="chip" style={{ color: preview.claim_reading.negative ? "var(--hot)" : "var(--green)" }}>
                    {preview.claim_reading.negative ? "Denial" : "Assertion"}
                  </span>
                  <span className="chip">about {AXIS_LABEL[preview.claim_reading.axis] ?? preview.claim_reading.axis}</span>
                  {preview.claim_reading.topic_labels.map((t) => <span key={t} className="chip" style={{ color: "var(--cyan)" }}>{t}</span>)}
                  {!preview.claim_reading.topic_labels.length && <span className="chip" style={{ color: "var(--hot)" }}>no data type found</span>}
                </div>
              </div>
              <div>
                <div className="label">What happens next</div>
                <ol className="dim" style={{ margin: 0, paddingLeft: 18, fontSize: "0.86rem", display: "grid", gap: 4 }}>
                  <li>Validators render the page and extract its privacy section.</li>
                  <li>If the listing never mentions {preview.claim_reading.topic_labels.join(", ") || "the data type"}, the verdict can only be <b>Inconclusive</b> — silence is not evidence.</li>
                  <li>If it declares it on that axis, validators decide whether it contradicts your claim.</li>
                </ol>
              </div>
              {preview.problems.length > 0 ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {preview.problems.map((p) => (
                    <div key={p} style={{ display: "flex", gap: 8, color: "var(--hot)", fontSize: "0.84rem" }}><AlertTriangle size={14} style={{ marginTop: 3, flexShrink: 0 }} /> {p}</div>
                  ))}
                  {preview.duplicate_of > 0 && <Link href={`/challenge/${preview.duplicate_of}`} className="btn btn-sm btn-ghost">Open challenge #{preview.duplicate_of}</Link>}
                </div>
              ) : (
                <div className="chip" style={{ color: "var(--green)", borderColor: "var(--green)", justifySelf: "start" }}><ShieldCheck size={13} /> Ready to file</div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
