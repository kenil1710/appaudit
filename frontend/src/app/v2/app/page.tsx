"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Blocks, History } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/States";
import { ShieldScanner } from "@/components/Scanner";
import { CaseRow, DevBadge } from "@/components/V2";
import { useByApp, useConsumerRecord, useRecord2 } from "@/lib/hooks2";
import { appName, short, when } from "@/lib/format";
import { appUrlFromKey, V2_CONSUMER_ADDRESS } from "@/lib/v2";
import { displayName, useTitles } from "@/lib/titles";

function AppRecordInner() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";
  const url = key ? (key.startsWith("http") ? key : appUrlFromKey(key)) : null;
  const { data: r, error, isLoading } = useRecord2(url);
  const { data: k } = useConsumerRecord(url);
  const { data: cases } = useByApp(url);
  const titles = useTitles(key && !key.startsWith("http") ? [key, ...(cases?.items ?? []).flatMap((c) => [c.app_key, c.app_key2])] : []);
  if (!url) return <AppShell title="App record"><ErrorState title="No app given" /></AppShell>;
  if (isLoading) return <AppShell><ShieldScanner label="Reading the app record…" /></AppShell>;
  if (error || !r) return <AppShell><ErrorState detail={error?.message} /></AppShell>;
  return (
    <AppShell eyebrow="App record" title={displayName(titles, r.app_key, r.label)}
      blurb={<><span className="hash">{r.app_key}</span>{titles[r.app_key] && <span className="muted"> · store title: {titles[r.app_key]}</span>}</>}
      actions={<>
        <Link className="btn btn-sm btn-ghost" href={`/v2/timeline?app=${encodeURIComponent(r.app_key)}`}><History size={14} /> Timeline</Link>
        <Link className="btn btn-sm btn-ghost" href={`/v2/developer?app=${encodeURIComponent(url)}`}><BadgeCheck size={14} /> Developer</Link>
      </>}>
      <div className="grid-cards" style={{ marginBottom: 16 }}>
        {[["contradicted", k ? k.contradicted : r.contradicted, "var(--hot)"], ["corrected", k ? k.corrected : r.corrected, "var(--amber)"], ["consistent (verified)", k ? k.verified : r.verified, "var(--green)"], ["inconclusive", k ? k.inconclusive : r.inconclusive, "var(--grey)"]].map(([l, v, c]) => (
          <div key={String(l)} className="glass panel" style={{ padding: 16 }}>
            <div className="label">{String(l)}</div>
            <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 700, color: String(c) }}>{String(v)}</div>
          </div>
        ))}
      </div>
      <p className="mono" style={{ margin: "0 0 16px", fontSize: "0.9rem" }}>
        {k ? <>{k.cases} case{k.cases === 1 ? "" : "s"} · {k.distinct_questions} distinct question{k.distinct_questions === 1 ? "" : "s"}<span className="muted"> — each question counts once, by its latest final verdict (per case, the contract records {k.per_case_counts?.contradicted ?? 0} contradicted · {k.per_case_counts?.verified ?? 0} verified · {k.per_case_counts?.corrected ?? 0} corrected · {k.per_case_counts?.inconclusive ?? 0} inconclusive)</span></> : "Counting distinct questions…"}
      </p>
      <div className="split" style={{ marginBottom: 16 }}>
        <div className="glass panel" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="eyebrow">This listing</div>
          <DevBadge verified={r.verified_developer} label={r.verified_developer ? `verified developer ${short(r.developer_wallet)}` : "no verified developer"} />
          <span className="mono" style={{ fontSize: "0.85rem" }}>last snapshot · {when(r.last_snapshot_at)} ({r.snapshots} total)</span>
          <span className="mono muted" style={{ fontSize: "0.8rem" }}>open {r.counts.open ?? 0} · in contest window {r.counts.pending_verdicts ?? 0} · defaulted {r.counts.defaulted ?? 0} · withdrawn {r.counts.withdrawn ?? 0} · stalled {r.counts.stalled ?? 0}</span>
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Verdicts count once final; one still inside its contest window can flip.</p>
        </div>
        <div className="glass panel" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}><Blocks size={14} /> AppTrustConsumerV2.app_record()</div>
          {k ? (<>
            <span className="mono" style={{ fontSize: "0.85rem" }}>reachable {String(k.reachable)} · trust score <b style={{ color: "var(--cyan)" }}>{k.trust_score}</b></span>
            <span className="mono muted" style={{ fontSize: "0.8rem" }}>contradicted {k.contradicted} · verified {k.verified} · corrected {k.corrected} · inconclusive {k.inconclusive} · verified developer {String(k.verified_developer)} · last snapshot {when(k.last_snapshot_at)}</span>
          </>) : <span className="muted">Reading the consumer…</span>}
          <span className="hash">{V2_CONSUMER_ADDRESS} · custody false · zero payable methods</span>
        </div>
      </div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Cases about this listing</div>
      <div style={{ display: "grid", gap: 12 }}>
        {(cases?.items ?? []).slice().reverse().map((c) => <CaseRow key={c.challenge_id} c={c} titles={titles} />)}
        {cases && cases.items.length === 0 && <p className="muted">None yet.</p>}
      </div>
    </AppShell>
  );
}

export default function AppRecordPage() {
  return <Suspense fallback={null}><AppRecordInner /></Suspense>;
}
