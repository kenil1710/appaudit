"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ShieldScanner } from "@/components/Scanner";
import { ErrorState, EmptyState } from "@/components/States";
import { DevBadge } from "@/components/V2";
import { useApps2 } from "@/lib/hooks2";
import { appName, when } from "@/lib/format";

export default function AppsV2() {
  const { data, error, isLoading } = useApps2();
  return (
    <AppShell eyebrow="AppAudit v2" title="App records" blurb="Every listing v2 has touched — through a case, a snapshot or an identity check — with its final verdict counts. The same record AppTrustConsumerV2 serves to marketplaces.">
      {isLoading && <ShieldScanner label="Reading app records…" />}
      {error && <ErrorState detail={error.message} />}
      {data && data.items.length === 0 && <EmptyState title="No apps yet" />}
      <div className="grid-cards">
        {data?.items.map((r) => (
          <Link key={r.app_key} href={`/v2/app?key=${encodeURIComponent(r.app_key)}`} className="glass glass-hover panel" style={{ display: "grid", gap: 10 }}>
            <div className="mono" style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{appName(r.app_key, r.label)}</div>
            <span className="hash">{r.app_key}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="chip" style={{ color: "var(--hot)" }}>{r.contradicted} contradicted</span>
              <span className="chip" style={{ color: "var(--amber)" }}>{r.corrected} corrected</span>
              <span className="chip" style={{ color: "var(--green)" }}>{r.verified} consistent</span>
              <span className="chip" style={{ color: "var(--grey)" }}>{r.inconclusive} inconclusive</span>
            </div>
            <DevBadge verified={r.verified_developer} label={r.verified_developer ? "verified developer" : "no verified developer"} />
            <span className="mono muted" style={{ fontSize: "0.74rem" }}>{r.snapshots} snapshot(s) · last {when(r.last_snapshot_at)}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
