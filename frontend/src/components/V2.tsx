"use client";

import Link from "next/link";
import { BadgeCheck, CircleHelp, GitCompareArrows, Layers, ScrollText, ShieldAlert, ShieldCheck, UserX, Wrench } from "lucide-react";
import { KIND_LABEL, LABEL_STATE, OUTCOME_COLOR, OUTCOME_LABEL, parseLabel, rowHits, type CaseCard, type Diff, type Topic } from "@/lib/v2";
import { appName } from "@/lib/format";

export function OutcomeBadge({ outcome, big = false }: { outcome: string; big?: boolean }) {
  const color = OUTCOME_COLOR[outcome] ?? "var(--amber)";
  const Icon = outcome === "CONTRADICTED" ? ShieldAlert : outcome === "CLAIM_VERIFIED" ? ShieldCheck : outcome === "CORRECTED" ? Wrench : CircleHelp;
  return (
    <span className="chip" style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 12%, transparent)`, ...(big ? { fontSize: "0.95rem", padding: "8px 16px" } : {}) }}>
      <Icon size={big ? 18 : 13} /> {outcome ? OUTCOME_LABEL[outcome] ?? outcome : "Pending"}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  const Icon = kind === "CROSS_STORE" ? GitCompareArrows : kind === "POLICY_LABEL" ? ScrollText : Layers;
  return <span className="chip" style={{ color: "var(--cyan)" }}><Icon size={13} /> {KIND_LABEL[kind] ?? kind}</span>;
}

export function DevBadge({ verified, label }: { verified: boolean; label?: string }) {
  return verified ? (
    <span className="chip chip-wrap" style={{ color: "var(--green)", borderColor: "var(--green)" }}><BadgeCheck size={13} /> {label ?? "verified developer"}</span>
  ) : (
    <span className="chip chip-wrap" style={{ color: "var(--amber)" }}><UserX size={13} /> {label ?? "respondent unverified"}</span>
  );
}

export function LabelState({ state }: { state: string }) {
  const s = LABEL_STATE[state] ?? { text: state || "—", color: "var(--grey)" };
  return <span className="chip" style={{ color: s.color, borderColor: s.color }}>{s.text}</span>;
}

/** One canonical label, grouped, with the case's data type highlighted. */
export function LabelColumn({ title, sub, text, state, topic, axis }: {
  title: string; sub?: string; text: string; state?: string; topic?: Topic; axis?: string;
}) {
  const rows = parseLabel(text);
  const groups: Record<string, string> = {
    none: "Explicit statements", shared: "Data shared", collected: "Data collected",
    tracking: "Data used to track you", linked: "Data linked to you", unlinked: "Data not linked to you",
  };
  const order = ["none", "shared", "tracking", "collected", "linked", "unlinked", "not provided"];
  return (
    <div className="glass panel" style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div className="eyebrow">{title}</div>
          {sub && <div className="mono muted" style={{ fontSize: "0.72rem", marginTop: 4 }}>{sub}</div>}
        </div>
        {state && <LabelState state={state} />}
      </div>
      {rows.length === 0 && <p className="muted" style={{ margin: 0 }}>No privacy section could be read.</p>}
      {order.map((g) => {
        const inG = rows.filter((r) => r.group === g);
        if (!inG.length) return null;
        return (
          <div key={g} style={{ marginBottom: 12 }}>
            <div className="label">{groups[g] ?? g}</div>
            <div style={{ display: "grid", gap: 4 }}>
              {inG.map((r, i) => {
                const hit = g !== "none" && rowHits(r, topic) && (!axis || axis === "collect" || g === "shared" || g === "tracking");
                const text2 = g === "none" ? (r.category === "shared" ? "No data shared with third parties" : r.category === "collected" ? "No data collected" : "Data Not Collected") : r.category;
                return (
                  <div key={i} className="mono" style={{
                    fontSize: "0.8rem", padding: "6px 9px", borderRadius: 8, overflowWrap: "anywhere",
                    border: `1px solid ${hit ? "var(--cyan)" : g === "none" ? "var(--lavender)" : "var(--line)"}`,
                    background: hit ? "var(--cyan-dim)" : g === "none" ? "var(--lavender-dim)" : "rgba(8,8,15,.45)",
                  }}>
                    {text2}{r.types ? <span className="muted"> · {r.types}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DiffChips({ diff, topics }: { diff: Diff | null; topics?: Topic[] }) {
  if (!diff) return <span className="muted mono" style={{ fontSize: "0.75rem" }}>first readable snapshot</span>;
  const name = (k: string) => topics?.find((t) => t.key === k)?.label ?? k;
  const chips: React.ReactNode[] = [];
  for (const g of ["collected", "shared", "none"] as const) {
    for (const a of diff[g].added) chips.push(<span key={g + "+" + a} className="chip" style={{ color: "var(--green)" }}>+ {g === "none" ? `“no data ${a}”` : `${name(a)} ${g}`}</span>);
    for (const r of diff[g].removed) chips.push(<span key={g + "-" + r} className="chip" style={{ color: "var(--hot)" }}>− {g === "none" ? `“no data ${r}”` : `${name(r)} ${g}`}</span>);
  }
  return chips.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{chips}</div> : <span className="muted mono" style={{ fontSize: "0.75rem" }}>no declared data type changed</span>;
}

export function CaseRow({ c }: { c: CaseCard }) {
  const name = appName(c.app_key, c.app_label);
  return (
    <Link href={`/v2/case/${c.challenge_id}`} className="glass glass-hover panel" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="mono" style={{ fontWeight: 700 }}>#{c.challenge_id} · {name}{c.app_key2 ? " × App Store" : ""}</span>
        <OutcomeBadge outcome={c.outcome} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <KindBadge kind={c.kind} />
        {c.topic && <span className="chip">{c.topic} · {c.axis}</span>}
        <span className="chip muted">{c.status.toLowerCase()}</span>
        {c.filing_result && c.kind !== "LABEL" && <span className="chip muted">at filing: {OUTCOME_LABEL[c.filing_result] ?? c.filing_result}</span>}
      </div>
      <p className="dim" style={{ margin: 0, fontSize: "0.86rem" }}>{c.claim}</p>
    </Link>
  );
}
