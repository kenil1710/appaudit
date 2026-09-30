"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GitCompareArrows, Layers, ScrollText, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useWallet } from "@/components/WalletProvider";
import { TxButton } from "@/components/TxButton";
import { useConfig2 } from "@/lib/hooks2";
import { gen, toWei } from "@/lib/format";
import { tx2, v2 } from "@/lib/v2";

type Mode = "CROSS_STORE" | "POLICY_LABEL" | "LABEL";

const EXAMPLES: Record<Mode, { a: string; b: string; t: string; axis: string }> = {
  CROSS_STORE: {
    a: "https://play.google.com/store/apps/details?id=com.snapchat.android",
    b: "https://apps.apple.com/us/app/snapchat/id447188370", t: "identifiers", axis: "share",
  },
  POLICY_LABEL: { a: "https://play.google.com/store/apps/details?id=com.linkedin.android", b: "", t: "identifiers", axis: "share" },
  LABEL: { a: "https://play.google.com/store/apps/details?id=com.whatsapp", b: "", t: "This app does not collect location data", axis: "" },
};

const HELP: Record<Mode, string> = {
  CROSS_STORE:
    "Name one data type and both store listings of the same app. At filing, validators render both labels and read both listings' developer identity; the case is refused unless the two listings are the same app. Code compares: one store declares the type, the other explicitly declares none → contradicted. A store that is silent → inconclusive.",
  POLICY_LABEL:
    "Name one data type and one listing. Validators find the privacy policy the LISTING links to — you cannot supply it — and the model classifies the policy into SHARED / COLLECTED / NOT_MENTIONED with a quote that must appear verbatim. Code compares with the label: policy says shared, label says no data shared → contradicted.",
  LABEL:
    "v1's claim type: a free-text privacy claim against one listing, judged with v1's evidence bracket. v2 freezes the listing at filing, so a contradiction fixed before judgment is CORRECTED.",
};

export default function FileV2() {
  const { data: config } = useConfig2();
  const { account } = useWallet();
  const [mode, setMode] = useState<Mode>("CROSS_STORE");
  const [a, setA] = useState(EXAMPLES.CROSS_STORE.a);
  const [b, setB] = useState(EXAMPLES.CROSS_STORE.b);
  const [t, setT] = useState(EXAMPLES.CROSS_STORE.t);
  const [axis, setAxis] = useState(EXAMPLES.CROSS_STORE.axis);
  const [stake, setStake] = useState("0.5");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof v2.preview>> | null>(null);
  const [checking, setChecking] = useState(false);
  const [newest, setNewest] = useState<number | null>(null);

  useEffect(() => {
    const e = EXAMPLES[mode];
    setA(e.a); setB(e.b); setT(e.t); setAxis(e.axis || "share"); setPreview(null);
  }, [mode]);

  const wei = toWei(stake);
  const min = BigInt(config?.min_stake_wei ?? "500000000000000000");
  const okStake = wei !== null && wei >= min;

  async function check() {
    setChecking(true);
    try { setPreview(await v2.preview(mode, a.trim(), b.trim(), t.trim(), axis, account ?? "")); } finally { setChecking(false); }
  }

  const run = (acc: `0x${string}`) =>
    mode === "CROSS_STORE" ? tx2.fileCross(acc, { play: a.trim(), apple: b.trim(), topic: t, axis, stake: wei ?? 0n })
      : mode === "POLICY_LABEL" ? tx2.filePolicy(acc, { url: a.trim(), topic: t, axis, stake: wei ?? 0n })
        : tx2.fileLabel(acc, { url: a.trim(), claim: t.trim(), stake: wei ?? 0n });

  return (
    <AppShell title="File a case" blurb="Stake that an app's own privacy declarations contradict each other. Validators fetch every piece of evidence themselves, at filing and again at judgment.">
      <div className="seg" style={{ marginBottom: 18 }}>
        <button aria-pressed={mode === "CROSS_STORE"} onClick={() => setMode("CROSS_STORE")}><GitCompareArrows size={13} /> Cross-store mismatch</button>
        <button aria-pressed={mode === "POLICY_LABEL"} onClick={() => setMode("POLICY_LABEL")}><ScrollText size={13} /> Policy vs label</button>
        <button aria-pressed={mode === "LABEL"} onClick={() => setMode("LABEL")}><Layers size={13} /> Claim vs label (v1)</button>
      </div>
      <div className="split">
        <div className="glass panel" style={{ display: "grid", gap: 14 }}>
          <p className="dim" style={{ margin: 0, fontSize: "0.9rem" }}>{HELP[mode]}</p>
          <label className="label" htmlFor="a">{mode === "CROSS_STORE" ? "Google Play listing" : "Store listing (Google Play or App Store)"}</label>
          <input id="a" className="input" value={a} onChange={(e) => setA(e.target.value)} />
          {mode === "CROSS_STORE" && (<>
            <label className="label" htmlFor="b">App Store listing</label>
            <input id="b" className="input" value={b} onChange={(e) => setB(e.target.value)} />
          </>)}
          {mode === "LABEL" ? (<>
            <label className="label" htmlFor="t">The privacy claim (20–500 characters)</label>
            <textarea id="t" className="textarea" value={t} onChange={(e) => setT(e.target.value)} maxLength={500} />
          </>) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label className="label" htmlFor="t">Data type (frozen list)</label>
                <select id="t" className="select" value={t} onChange={(e) => setT(e.target.value)}>
                  {(config?.topics ?? [{ key: t, label: t }]).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label className="label" htmlFor="axis">Declaration</label>
                <select id="axis" className="select" value={axis} onChange={(e) => setAxis(e.target.value)}>
                  <option value="share">shared with other companies</option>
                  <option value="collect">collected</option>
                </select>
              </div>
            </div>
          )}
          <label className="label" htmlFor="stake">Stake (GEN, at least {gen(min.toString())})</label>
          <input id="stake" className="input" value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={() => void check()} disabled={checking}><Search size={15} /> {checking ? "Checking…" : "Check before staking"}</button>
          </div>
          <TxButton label="Stake and file" disabled={!okStake || !a.trim()} waitingLabel="Validators capturing the evidence…"
            run={run} onDone={async () => { const list = await v2.cases(0, 1); setNewest(list.items[0]?.challenge_id ?? null); }} />
          {newest && <Link className="btn btn-sm btn-ghost" href={`/v2/case/${newest}`}>Open the newest case (#{newest}) →</Link>}
        </div>
        <div className="glass panel" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="eyebrow">What validators will fetch</div>
          {!preview && <p className="muted" style={{ margin: 0 }}>Run the check to see the exact pages validators rebuild from your URLs. Nothing you type is fetched as typed.</p>}
          {preview && (<>
            <span className="chip" style={{ justifySelf: "start", color: preview.ok ? "var(--green)" : "var(--hot)" }}>{preview.ok ? "would be accepted for consensus" : "would be refused"}</span>
            {preview.problems.map((p) => <span key={p} style={{ color: "var(--hot)", fontSize: "0.85rem" }}>{p}</span>)}
            {[["label page", preview.fetch_url], ["second label page", preview.fetch_url2], ["identity page", preview.identity_url], ["second identity page", preview.identity_url2]]
              .filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><div className="label">{k}</div><span className="hash" style={{ overflowWrap: "anywhere" }}>{v}</span></div>
              ))}
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              {mode === "CROSS_STORE" ? "The two listings must be the same app — the same title exactly (after dropping case, punctuation and ™/®; a store subtitle after “:” or “ - ” may differ) AND the same developer (name, or the developer's own website host) — or the filing is refused and your stake stays claimable."
                : mode === "POLICY_LABEL" ? "The policy link is read off the identity page. A policy over the size limit, unreadable, or unlinked is refused at filing — no stake is taken."
                  : "The claim must name a data type from the frozen list."}
              {" "}Duplicates are refused per advocate: nobody can hold a question hostage by filing it first.
            </p>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              A contradiction that is FIXED before judgment is CORRECTED (you win) only if the filing capture is confirmed by a second read: take a paid snapshot before filing, or press &ldquo;Confirm the filing capture&rdquo; on the case right after filing. Unconfirmed, a fixed contradiction is INCONCLUSIVE and both stakes come back.
            </p>
          </>)}
        </div>
      </div>
    </AppShell>
  );
}
