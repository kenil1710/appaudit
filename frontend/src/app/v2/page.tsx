"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilePlus2, RotateCcw, Scale } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ErrorState, EmptyState } from "@/components/States";
import { ShieldScanner } from "@/components/Scanner";
import { CaseRow } from "@/components/V2";
import { useCases2, useStats2 } from "@/lib/hooks2";
import { gen } from "@/lib/format";
import { V2_ADDRESS } from "@/lib/v2";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "CROSS_STORE", label: "Cross-store" },
  { key: "POLICY_LABEL", label: "Policy vs label" },
  { key: "LABEL", label: "Claim vs label" },
];

export default function CasesV2() {
  const { data, error, isLoading, mutate } = useCases2();
  const { data: stats } = useStats2();
  const [f, setF] = useState("all");
  const items = useMemo(() => (data?.items ?? []).filter((c) => f === "all" || c.kind === f), [data, f]);
  return (
    <AppShell eyebrow="AppAudit v2" title="Cases"
      blurb={<>Every v2 case on the demo instance <span className="hash">{V2_ADDRESS}</span>, read live from the chain. Evidence is frozen at filing and read again at judgment.</>}
      actions={<Link className="btn btn-primary" href="/v2/file"><FilePlus2 size={16} /> File a case</Link>}>
      {stats && (
        <div className="grid-cards" style={{ marginBottom: 22 }}>
          {[
            ["cases", stats.cases], ["judgments", stats.judgments], ["snapshots", stats.snapshots],
            ["verified devs", stats.verifications], ["open stakes", `${gen(stats.locked_wei)} GEN`],
            ["claimable", `${gen(stats.claimable_wei)} GEN`],
          ].map(([k, v]) => (
            <div key={String(k)} className="glass panel" style={{ padding: 16 }}>
              <div className="label">{k}</div>
              <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 700 }}>{String(v)}</div>
            </div>
          ))}
          <Link href="/v2/balance" className="glass glass-hover panel" style={{ padding: 16 }}>
            <div className="label"><Scale size={12} /> ledger</div>
            <div className="mono" style={{ color: stats.ledger_balanced ? "var(--green)" : "var(--hot)", fontWeight: 700 }}>
              {stats.ledger_balanced ? "balanced" : "UNBALANCED"}
            </div>
          </Link>
        </div>
      )}
      <div className="seg" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        {FILTERS.map((x) => (
          <button key={x.key} aria-pressed={f === x.key} onClick={() => setF(x.key)}>{x.label}</button>
        ))}
      </div>
      {isLoading && <ShieldScanner label="Reading v2 cases…" />}
      {error && <ErrorState detail={error.message} action={<button className="btn btn-sm btn-ghost" onClick={() => void mutate()}><RotateCcw size={14} /> Retry</button>} />}
      {data && items.length === 0 && <EmptyState title="No cases here yet" action={<Link className="btn btn-sm btn-primary" href="/v2/file">File the first</Link>} />}
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((c) => <CaseRow key={c.challenge_id} c={c} />)}
      </div>
    </AppShell>
  );
}
