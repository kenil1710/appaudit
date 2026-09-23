"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Filter, Search, ShieldPlus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChallengeCardView } from "@/components/ChallengeCard";
import { ShieldScanner } from "@/components/Scanner";
import { EmptyState, ErrorState } from "@/components/States";
import { useChallenges } from "@/lib/hooks";
import { appName } from "@/lib/format";
import type { ChallengeCard } from "@/lib/types";

const STATES = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "responded", label: "Responded" },
  { key: "settled", label: "Settled" },
] as const;
const PLATFORMS = [
  { key: "all", label: "All stores" },
  { key: "google_play", label: "Google Play" },
  { key: "app_store", label: "App Store" },
] as const;
const OUTCOMES = [
  { key: "all", label: "Any verdict" },
  { key: "CONTRADICTED", label: "Contradicted" },
  { key: "CLAIM_VERIFIED", label: "Verified" },
  { key: "INCONCLUSIVE", label: "Inconclusive" },
] as const;
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "stake", label: "Highest stake" },
  { key: "contradictions", label: "Most contradictions" },
] as const;

function matchesState(c: ChallengeCard, s: string) {
  if (s === "open") return c.status === "FILED";
  if (s === "responded") return c.status === "RESPONDED";
  if (s === "settled") return !["FILED", "RESPONDED"].includes(c.status);
  return true;
}

function Seg<T extends string>({ items, value, onChange }: { items: readonly { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {items.map((i) => (
        <button key={i.key} aria-pressed={value === i.key} onClick={() => onChange(i.key)}>{i.label}</button>
      ))}
    </div>
  );
}

function Results() {
  const params = useSearchParams();
  const appFilter = params.get("app") ?? "";
  const { data, error, isLoading, mutate } = useChallenges();
  const [state, setState] = useState<(typeof STATES)[number]["key"]>("all");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["key"]>("all");
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]["key"]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("newest");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const all = data?.items ?? [];
    const contradictionsByApp: Record<string, number> = {};
    for (const c of all) if (c.outcome === "CONTRADICTED") contradictionsByApp[c.app_key] = (contradictionsByApp[c.app_key] ?? 0) + 1;
    const needle = q.trim().toLowerCase();
    const out = all.filter((c) =>
      (!appFilter || c.app_key === appFilter) &&
      matchesState(c, state) &&
      (platform === "all" || c.platform === platform) &&
      (outcome === "all" || c.outcome === outcome) &&
      (!needle || appName(c.app_key, c.app_label).toLowerCase().includes(needle) || c.app_key.toLowerCase().includes(needle) ||
        c.fetch_url.toLowerCase().includes(needle) || c.claim.toLowerCase().includes(needle)),
    );
    const stake = (c: ChallengeCard) => BigInt(c.advocate_stake_wei || "0") + BigInt(c.respondent_stake_wei || "0");
    if (sort === "stake") out.sort((a, b) => (stake(b) > stake(a) ? 1 : stake(b) < stake(a) ? -1 : 0));
    else if (sort === "contradictions") out.sort((a, b) => (contradictionsByApp[b.app_key] ?? 0) - (contradictionsByApp[a.app_key] ?? 0) || b.challenge_id - a.challenge_id);
    else out.sort((a, b) => b.challenge_id - a.challenge_id);
    return out;
  }, [data, appFilter, state, platform, outcome, sort, q]);

  return (
    <>
      <div className="glass panel" style={{ display: "grid", gap: 14, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} color="var(--muted)" style={{ position: "absolute", left: 14, top: 14 }} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by app name, package, URL or claim" style={{ paddingLeft: 40 }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <Filter size={15} color="var(--cyan)" />
          <Seg items={STATES} value={state} onChange={setState} />
          <Seg items={PLATFORMS} value={platform} onChange={setPlatform} />
          <Seg items={OUTCOMES} value={outcome} onChange={setOutcome} />
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <ArrowDownWideNarrow size={15} color="var(--cyan)" />
            <Seg items={SORTS} value={sort} onChange={setSort} />
          </span>
        </div>
        {appFilter && (
          <div>
            <Link href="/challenges" className="chip" style={{ color: "var(--cyan)" }}>app: {appFilter} <X size={12} /></Link>
          </div>
        )}
      </div>
      {isLoading && <ShieldScanner label="Reading challenges from the chain…" />}
      {error && <ErrorState detail={error.message} action={<button className="btn btn-sm btn-ghost" onClick={() => void mutate()}>Retry</button>} />}
      {data && items.length === 0 && (
        <EmptyState title="No challenges match" detail="Try a different filter, or file the first challenge for this app."
          action={<Link href="/challenge" className="btn btn-primary btn-sm"><ShieldPlus size={14} /> Challenge an app</Link>} />
      )}
      {items.length > 0 && (
        <div className="grid-cards">
          {items.map((c, i) => <ChallengeCardView key={c.challenge_id} c={c} index={i} />)}
        </div>
      )}
    </>
  );
}

export default function ChallengesPage() {
  return (
    <AppShell eyebrow="Results" title="Every privacy challenge, on chain"
      blurb="Open challenges waiting for a developer, verdicts inside their contest window, and final results."
      actions={<Link href="/challenge" className="btn btn-primary"><ShieldPlus size={16} /> New challenge</Link>}>
      <Suspense fallback={<ShieldScanner />}>
        <Results />
      </Suspense>
    </AppShell>
  );
}
