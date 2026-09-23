"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CircleDashed, Search, ShieldAlert, ShieldCheck, ShieldPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlatformBadge } from "@/components/Badges";
import { AppGlyph } from "@/components/ChallengeCard";
import { ShieldScanner } from "@/components/Scanner";
import { EmptyState, ErrorState } from "@/components/States";
import { useApps } from "@/lib/hooks";
import { appName } from "@/lib/format";
import type { AppSummary } from "@/lib/types";

function TrustBadge({ a }: { a: AppSummary }) {
  if (a.badge === "FLAGGED") return <span className="chip" style={{ color: "var(--hot)", borderColor: "var(--hot)" }}><ShieldAlert size={13} /> Flagged</span>;
  if (a.badge === "CLEAN") return <span className="chip" style={{ color: "var(--green)", borderColor: "var(--green)" }}><ShieldCheck size={13} /> Clean</span>;
  return <span className="chip muted"><CircleDashed size={13} /> Unaudited</span>;
}

export default function AppsPage() {
  const { data, error, isLoading, mutate } = useApps();
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.items ?? [])
      .filter((a) => !needle || appName(a.app_key, a.label).toLowerCase().includes(needle) || a.app_key.includes(needle))
      .sort((a, b) => b.counts.contradicted - a.counts.contradicted || b.counts.total - a.counts.total);
  }, [data, q]);

  return (
    <AppShell eyebrow="Apps" title="Apps that have been challenged"
      blurb="Flagged means at least one privacy claim was contradicted by the app's own listing in a FINAL verdict. Clean means it was judged and never contradicted. A default or a verdict still inside its contest window changes neither.">
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={16} color="var(--muted)" style={{ position: "absolute", left: 14, top: 14 }} />
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" style={{ paddingLeft: 40 }} />
      </div>
      {isLoading && <ShieldScanner label="Reading audited apps…" />}
      {error && <ErrorState detail={error.message} action={<button className="btn btn-sm btn-ghost" onClick={() => void mutate()}>Retry</button>} />}
      {data && items.length === 0 && <EmptyState title="No apps yet" action={<Link href="/challenge" className="btn btn-primary btn-sm"><ShieldPlus size={14} /> Challenge an app</Link>} />}
      <div className="grid-cards">
        {items.map((a, i) => {
          const name = appName(a.app_key, a.label);
          const color = a.badge === "FLAGGED" ? "var(--hot)" : a.badge === "CLEAN" ? "var(--green)" : "var(--cyan)";
          return (
            <motion.div key={a.app_key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/challenges?app=${encodeURIComponent(a.app_key)}`} className="glass glass-hover" style={{ display: "block", padding: 18 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <AppGlyph name={name} color={color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mono" style={{ fontWeight: 700 }}>{name}</div>
                    <div className="hash" style={{ fontSize: "0.7rem" }}>{a.app_key}</div>
                  </div>
                  <TrustBadge a={a} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
                  {[
                    { label: "challenges", value: a.counts.total, color: "var(--text)" },
                    { label: "contradicted", value: a.counts.contradicted, color: "var(--hot)" },
                    { label: "verified", value: a.counts.verified, color: "var(--green)" },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center", padding: 10, borderRadius: 10, background: "rgba(8,8,15,.5)" }}>
                      <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div className="muted" style={{ fontSize: "0.7rem" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <PlatformBadge platform={a.platform} />
                  <span className="mono" style={{ fontSize: "0.78rem", color: "var(--cyan)", display: "inline-flex", gap: 6, alignItems: "center" }}>View challenges <ArrowRight size={13} /></span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}
