"use client";

import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { Apple, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ShieldScanner } from "@/components/Scanner";
import { ErrorState, EmptyState } from "@/components/States";
import { DevBadge } from "@/components/V2";
import { useApps2, useCases2 } from "@/lib/hooks2";
import { when } from "@/lib/format";
import { appUrlFromKey, v2, type AppRecord } from "@/lib/v2";
import { displayName, useTitles } from "@/lib/titles";

/** One app = the listings validators BOUND as the same app in a cross-store
 *  case (same title and developer, checked at filing). A listing no
 *  cross-store case has bound is its own app. The contract stays per listing;
 *  this is only how the page groups what it reads. */
function groupListings(records: AppRecord[], pairs: [string, string][]): string[][] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r) as string;
    return r;
  };
  for (const r of records) parent.set(r.app_key, r.app_key);
  for (const [a, b] of pairs) {
    if (!parent.has(a) || !parent.has(b)) continue;
    parent.set(find(b), find(a));
  }
  const groups = new Map<string, string[]>();
  for (const r of records) {
    const root = find(r.app_key);
    groups.set(root, [...(groups.get(root) ?? []), r.app_key]);
  }
  return [...groups.values()].map((g) => g.sort((x, y) => (x.startsWith("google_play") ? -1 : y.startsWith("google_play") ? 1 : 0)));
}

function StoreRecord({ r }: { r: AppRecord }) {
  const url = appUrlFromKey(r.app_key);
  const { data: k } = useSWR(["v2-consumer", url], () => v2.consumerRecord(url), { revalidateOnFocus: false });
  const play = r.app_key.startsWith("google_play");
  return (
    <Link href={`/v2/app?key=${encodeURIComponent(r.app_key)}`} className="glass glass-hover" style={{ padding: 14, display: "grid", gap: 8, borderRadius: 12, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {play ? <Smartphone size={15} color="var(--green)" /> : <Apple size={15} />}
        <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>{play ? "Google Play" : "App Store"}</span>
      </div>
      <span className="hash">{r.app_key}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span className="chip" style={{ color: "var(--hot)" }}>{k ? k.contradicted : r.contradicted} contradicted</span>
        <span className="chip" style={{ color: "var(--amber)" }}>{k ? k.corrected : r.corrected} corrected</span>
        <span className="chip" style={{ color: "var(--green)" }}>{k ? k.verified : r.verified} consistent</span>
        <span className="chip" style={{ color: "var(--grey)" }}>{k ? k.inconclusive : r.inconclusive} inconclusive</span>
      </div>
      <span className="mono muted" style={{ fontSize: "0.74rem" }}>
        {k ? `${k.cases} case${k.cases === 1 ? "" : "s"} · ${k.distinct_questions} distinct question${k.distinct_questions === 1 ? "" : "s"} · trust ${k.trust_score}` : `${r.counts.total ?? 0} cases`}
      </span>
      <DevBadge verified={r.verified_developer} label={r.verified_developer ? "verified developer" : "no verified developer"} />
      <span className="mono muted" style={{ fontSize: "0.72rem" }}>{r.snapshots} snapshot(s) · last {when(r.last_snapshot_at)}</span>
    </Link>
  );
}

export default function AppsV2() {
  const { data, error, isLoading } = useApps2();
  const { data: cases } = useCases2();
  const records = useMemo(() => data?.items ?? [], [data]);
  const pairs = useMemo(() => (cases?.items ?? [])
    .filter((c) => c.kind === "CROSS_STORE" && c.app_key2)
    .map((c) => [c.app_key, c.app_key2] as [string, string]), [cases]);
  const groups = useMemo(() => groupListings(records, pairs), [records, pairs]);
  const titles = useTitles(records.map((r) => r.app_key));
  const byKey = new Map(records.map((r) => [r.app_key, r]));
  return (
    <AppShell title="Apps" blurb="One card per app, with its Google Play and App Store records side by side. Two listings count as one app when validators bound them in a cross-store case (same title and developer). Verdicts are counted once per distinct question — the same record AppTrustConsumerV2 serves to marketplaces.">
      {isLoading && <ShieldScanner label="Reading app records…" />}
      {error && <ErrorState detail={error.message} />}
      {data && records.length === 0 && <EmptyState title="No apps yet" />}
      <div style={{ display: "grid", gap: 14 }}>
        {groups.map((g) => {
          const first = byKey.get(g[0]) as AppRecord;
          const name = displayName(titles, g.find((k) => titles[k]) ?? g[0], first.label);
          return (
            <div key={g.join("|")} className="glass panel" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: "1.15rem" }}>{name}</span>
                <span className="muted mono" style={{ fontSize: "0.74rem" }}>{g.length === 2 ? "both stores · bound by validators" : g[0].startsWith("google_play") ? "Google Play only (no App Store listing on record)" : "App Store only (no Google Play listing on record)"}</span>
              </div>
              <div className="split">
                {g.map((k) => <StoreRecord key={k} r={byKey.get(k) as AppRecord} />)}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
