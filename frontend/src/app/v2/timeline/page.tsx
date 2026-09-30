"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, GitCommitVertical, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TxButton } from "@/components/TxButton";
import { DiffChips, LabelColumn } from "@/components/V2";
import { EmptyState, ErrorState } from "@/components/States";
import { useConfig2, useTimeline } from "@/lib/hooks2";
import { gen, short, when } from "@/lib/format";
import { appUrlFromKey, tx2 } from "@/lib/v2";

function TimelineInner() {
  const params = useSearchParams();
  const first = params.get("app") ?? "https://play.google.com/store/apps/details?id=com.whatsapp";
  const [input, setInput] = useState(first.includes(":") && !first.startsWith("http") ? appUrlFromKey(first) : first);
  const [url, setUrl] = useState<string>(first.includes(":") && !first.startsWith("http") ? appUrlFromKey(first) : first);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;
  const { data, error, mutate } = useTimeline(url, offset, LIMIT);
  const { data: config } = useConfig2();
  const [open, setOpen] = useState<number | null>(null);
  const fee = BigInt(config?.snapshot_fee_wei ?? "10000000000000000");
  const items = data?.items ?? [];   // newest first, one page
  return (
    <AppShell title="Label timeline"
      blurb={<>Every canonical label validators agreed they read — paid snapshots always, filings and judgments only when the label changed — newest first, paginated. The diffs are computed by the contract, in a view: data types added or removed per declaration. Anyone can add a snapshot for {gen(fee.toString())} GEN (at most {config?.snapshot_cap_per_day ?? 4} per listing per UTC day).</>}>
      <div className="glass panel" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input className="input" style={{ flex: 1, minWidth: 240 }} value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-ghost" onClick={() => { setOffset(0); setUrl(input.trim()); }}><Search size={15} /> Show</button>
        <TxButton label={`Snapshot now (${gen(fee.toString())} GEN)`} icon={<Camera size={15} />} waitingLabel="Validators reading the label…"
          run={(a) => tx2.snapshot(a, url, fee)} onDone={() => void mutate()} />
      </div>
      {error && <ErrorState detail={error.message} />}
      {data && !data.found && <EmptyState title="No snapshots for this listing yet" detail="File a case about it or take a snapshot." />}
      {data?.found && (
        <>
          <div className="mono muted" style={{ marginBottom: 14, fontSize: "0.8rem" }}>
            {data.app_key} · {data.total} snapshot(s), {data.changes} with a change · showing {data.offset + 1}–{data.offset + items.length} · last {when(data.last_snapshot_at)} · <Link href={`/v2/app?key=${encodeURIComponent(data.app_key)}`} style={{ color: "var(--cyan)" }}>app record</Link>
          </div>
          <div style={{ display: "grid", gap: 0 }}>
            {items.map((s, i) => (
              <div key={s.snapshot_id} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", border: `1px solid ${s.changed ? "var(--amber)" : "var(--line-strong)"}`, color: s.changed ? "var(--amber)" : "var(--text-2)" }}><GitCommitVertical size={14} /></span>
                  {i < items.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 18, background: "var(--line-strong)" }} />}
                </div>
                <div className="glass panel" style={{ flex: 1, marginBottom: 12, padding: 16, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: "0.85rem" }}>
                      {when(s.at)} · {s.source}{s.case_id ? <> · <Link href={`/v2/case/${s.case_id}`} style={{ color: "var(--cyan)" }}>case #{s.case_id}</Link></> : null} · by {short(s.by)}
                    </span>
                    <span className="hash">{s.page_state} · {s.hash}</span>
                  </div>
                  <div style={{ marginTop: 10 }}><DiffChips diff={s.diff} topics={config?.topics} /></div>
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={() => setOpen(open === s.snapshot_id ? null : s.snapshot_id)}>{open === s.snapshot_id ? "Hide label" : "Show label"}</button>
                  {open === s.snapshot_id && <div style={{ marginTop: 10 }}><LabelColumn title="Canonical label" text={s.label} /></div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
            <button className="btn btn-sm btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>Newer</button>
            <button className="btn btn-sm btn-ghost" disabled={offset + LIMIT >= data.total} onClick={() => setOffset(offset + LIMIT)}>Older</button>
          </div>
        </>
      )}
    </AppShell>
  );
}

export default function TimelinePage() {
  return <Suspense fallback={null}><TimelineInner /></Suspense>;
}
