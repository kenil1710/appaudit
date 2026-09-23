"use client";

import Link from "next/link";
import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, BadgeCheck, Ban, Clock, Coins, ExternalLink, FileSearch, Gavel, Hash, History, Hourglass, MessageSquare,
  RotateCcw, Scale, Share2, Shield, ShieldCheck, Swords, Undo2, Wallet, Eye, Radar, Layers,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlatformBadge, StatusBadge, VerdictBadge } from "@/components/Badges";
import { AppGlyph } from "@/components/ChallengeCard";
import { CategoryTags, StrengthGauge } from "@/components/Findings";
import { PrivacyScan, ShieldScanner } from "@/components/Scanner";
import { ErrorState } from "@/components/States";
import { TxButton } from "@/components/TxButton";
import { VerdictReveal } from "@/components/VerdictReveal";
import { useWallet } from "@/components/WalletProvider";
import {
  claimPayout, contest, defaultJudgment, finalize, judge, respond, settleStalled, withdrawChallenge,
} from "@/lib/contract";
import { useChallenge, useConfig, useVerification } from "@/lib/hooks";
import {
  appName, AXIS_LABEL, CASE_LABEL, duration, gen, short, storeUrl, toWei, verdictColor, VERDICT_LABEL, when, ZERO,
} from "@/lib/format";
import type { Challenge, Config } from "@/lib/types";

function hotWords(c: Challenge, config?: Config): string[] {
  const out: string[] = [];
  for (const key of c.matched) {
    const t = config?.topics.find((x) => x.key === key);
    if (t) out.push(...t.page_words);
  }
  return out;
}

function Party({ side, address, stake, children }: { side: "advocate" | "developer"; address: string; stake: string; children: React.ReactNode }) {
  const color = side === "advocate" ? "var(--cyan)" : "var(--lavender)";
  return (
    <div className="glass panel" style={{ borderColor: color, boxShadow: `inset 0 1px 0 ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div className="eyebrow" style={{ color, display: "flex", gap: 8, alignItems: "center" }}>
          {side === "advocate" ? <Shield size={14} /> : <MessageSquare size={14} />} {side === "advocate" ? "Privacy advocate" : "App developer"}
        </div>
        <span className="chip" style={{ color }}><Coins size={12} /> {gen(stake)} GEN</span>
      </div>
      {address && address !== ZERO && <div className="hash" style={{ margin: "8px 0 0" }}>{short(address)}</div>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

function RespondForm({ c, refresh }: { c: Challenge; refresh: () => void }) {
  const [text, setText] = useState("");
  const [policy, setPolicy] = useState("");
  const [stake, setStake] = useState(gen(c.windows.min_stake_wei));
  const wei = toWei(stake);
  const okStake = wei !== null && wei >= BigInt(c.windows.min_stake_wei);
  const len = text.trim().length;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} maxLength={1020} placeholder="Our listing is correct because…" />
      <div className="mono muted" style={{ fontSize: "0.72rem" }}>{len}/1000 · at least 20</div>
      <input className="input" value={policy} onChange={(e) => setPolicy(e.target.value)} placeholder="Privacy policy URL (optional, https://…)" />
      <input className="input" value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" aria-label="Counter-stake in GEN" />
      <TxButton className="btn btn-lav" label="Counter-stake and respond" icon={<MessageSquare size={16} />}
        disabled={len < 20 || len > 1000 || !okStake}
        run={(acc) => respond(acc, { id: c.challenge_id, text: text.trim(), policyUrl: policy.trim(), stakeWei: wei ?? 0n })}
        onDone={refresh} />
    </div>
  );
}

function ContestForm({ c, refresh }: { c: Challenge; refresh: () => void }) {
  const [evidence, setEvidence] = useState("");
  const len = evidence.trim().length;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <textarea className="textarea" value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={1020}
        placeholder="New evidence the record does not already contain. Re-sending the response is refused." />
      <div className="mono muted" style={{ fontSize: "0.72rem" }}>{len}/1000 · stake exactly {gen(c.contest.stake_required_wei)} GEN</div>
      <TxButton label="Stake and contest" icon={<Swords size={16} />} disabled={len < 20}
        waitingLabel="Validators re-reading the listing…"
        run={(acc) => contest(acc, { id: c.challenge_id, evidence: evidence.trim(), stakeWei: BigInt(c.contest.stake_required_wei) })}
        onDone={refresh} />
    </div>
  );
}

function Settlement({ c }: { c: Challenge }) {
  const s = c.settlement;
  const adv = BigInt(c.advocate_stake_wei || "0");
  const resp = BigInt(c.respondent_stake_wei || "0");
  const cs = BigInt(c.contest.stake_wei || "0");
  let formula = "";
  if (c.status === "DEFAULTED") formula = "No response: the advocate's stake comes back in full. No developer stake exists to split, so no fee.";
  else if (c.status === "WITHDRAWN") formula = "Withdrawn before a response: the advocate's stake comes back in full.";
  else if (c.status === "STALLED") formula = "No agreed judgment within the stall window: both stakes refunded in full.";
  else if (c.outcome === "CONTRADICTED") formula = `Advocate wins: ${gen(adv.toString())} back + 80% × ${gen(resp.toString())}. Protocol 10%, developer keeps 10%.`;
  else if (c.outcome === "CLAIM_VERIFIED") formula = `Developer wins: ${gen(resp.toString())} back + 80% × ${gen(adv.toString())}. Protocol 10%, advocate keeps 10%.`;
  else if (c.outcome === "INCONCLUSIVE") formula = "Inconclusive: both stakes back in full, no fee.";
  if (cs > 0n) formula += c.contest.result === "FLIPPED" ? ` Contest flipped the verdict: ${gen(cs.toString())} GEN returned to the contester.` : ` Contest held: ${gen(cs.toString())} GEN forfeited to the winner.`;
  const rows = [
    { who: "Advocate", wei: s.owed_advocate_wei, paid: s.paid_advocate, color: "var(--cyan)" },
    { who: "Developer", wei: s.owed_respondent_wei, paid: s.paid_respondent, color: "var(--lavender)" },
    { who: "Protocol", wei: s.owed_protocol_wei, paid: s.paid_protocol, color: "var(--muted)" },
  ];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="dim" style={{ margin: 0, fontSize: "0.88rem" }}>{formula || "Settlement is computed when the verdict lands."}</p>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.who} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(8,8,15,.5)", border: "1px solid var(--line)" }}>
            <span className="mono" style={{ color: r.color }}>{r.who}</span>
            <span className="mono" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {gen(r.wei, 4)} GEN
              {BigInt(r.wei || "0") > 0n && <span className="chip" style={{ color: r.paid ? "var(--green)" : "var(--amber)" }}>{r.paid ? "paid" : "owed"}</span>}
            </span>
          </div>
        ))}
      </div>
      <div className="mono muted" style={{ fontSize: "0.74rem" }}>still held by the contract for this challenge: {gen(s.locked_wei, 4)} GEN</div>
    </div>
  );
}

function Verify({ c }: { c: Challenge }) {
  const [on, setOn] = useState(false);
  const { data, isLoading, error } = useVerification(c.challenge_id, on);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <button className="btn btn-ghost" onClick={() => setOn(true)} disabled={on && isLoading}>
        <BadgeCheck size={16} /> {isLoading ? "Recomputing…" : "Verify this judgment"}
      </button>
      <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
        Recomputes every derived field, the content hash and the settlement from the stored privacy text and the agreed verdict — on chain, in a view.
      </p>
      {error && <span style={{ color: "var(--hot)" }}>{error.message}</span>}
      {data?.checks && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "grid", gap: 6 }}>
          <div className="chip" style={{ justifySelf: "start", color: data.verified ? "var(--green)" : "var(--hot)", borderColor: data.verified ? "var(--green)" : "var(--hot)" }}>
            {data.verified ? <ShieldCheck size={13} /> : <Ban size={13} />} {data.verified ? "Every field recomputes" : "Mismatch found"}
          </div>
          {data.checks.map((k) => (
            <div key={k.field} className="mono" style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.74rem", color: k.match ? "var(--text-2)" : "var(--hot)" }}>
              <span>{k.match ? "✓" : "✗"} {k.field}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>{k.recomputed}</span>
            </div>
          ))}
        </motion.div>
      )}
      {data && !data.judged && <span className="muted">{data.note}</span>}
    </div>
  );
}

function Timeline({ c }: { c: Challenge }) {
  const ev = [
    { at: c.filed_at, icon: Shield, text: "Challenge filed", color: "var(--cyan)" },
    { at: c.responded_at, icon: MessageSquare, text: "Developer responded", color: "var(--lavender)" },
    { at: c.contest.at && c.contest.result === "FLIPPED" ? 0 : c.judged_at, icon: Gavel, text: `Validators judged: ${VERDICT_LABEL[c.contest.original_outcome || c.outcome] ?? ""}`, color: verdictColor(c.contest.original_outcome || c.outcome) },
    { at: c.contest.at, icon: Swords, text: `Contested: ${c.contest.result === "FLIPPED" ? "verdict flipped" : "verdict held"}`, color: "var(--amber)" },
    { at: c.closed_at, icon: History, text: `Closed: ${c.status.toLowerCase()}`, color: "var(--text-2)" },
  ].filter((e) => e.at > 0);
  if (c.contest.result === "FLIPPED") ev.splice(2, 0, { at: c.contest.at - 1, icon: Gavel, text: `Validators judged: ${VERDICT_LABEL[c.contest.original_outcome] ?? ""}`, color: verdictColor(c.contest.original_outcome) });
  ev.sort((a, b) => a.at - b.at);
  return (
    <div style={{ display: "grid", gap: 0 }}>
      {ev.map((e, i) => (
        <motion.div key={e.text} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", border: `1px solid ${e.color}`, color: e.color }}><e.icon size={14} /></span>
            {i < ev.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 18, background: "var(--line-strong)" }} />}
          </div>
          <div style={{ paddingBottom: 16 }}>
            <div style={{ fontSize: "0.9rem" }}>{e.text}</div>
            <div className="mono muted" style={{ fontSize: "0.72rem" }}>{when(e.at)}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Eye; title: string; children: React.ReactNode }) {
  return (
    <div className="glass panel">
      <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}><Icon size={14} /> {title}</div>
      {children}
    </div>
  );
}

export default function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params);
  const id = Number(raw);
  const valid = Number.isInteger(id) && id > 0;
  const live = true;
  const { data: c, error, isLoading, mutate } = useChallenge(valid ? id : null, live);
  const { data: config } = useConfig();
  const { account } = useWallet();
  const refresh = () => void mutate();
  const now = Date.now() / 1000;

  if (!valid) return <AppShell title="Challenge not found"><ErrorState title="That is not a challenge id" /></AppShell>;
  if (isLoading) return <AppShell><ShieldScanner label={`Reading challenge #${id}…`} /></AppShell>;
  if (error) return <AppShell><ErrorState detail={error.message} action={<button className="btn btn-sm btn-ghost" onClick={refresh}><RotateCcw size={14} /> Retry</button>} /></AppShell>;
  if (!c || !c.found) return <AppShell title={`Challenge #${id}`}><ErrorState title="No such challenge" detail="It may not have been filed yet." action={<Link className="btn btn-sm btn-ghost" href="/challenges">All challenges</Link>} /></AppShell>;

  const name = appName(c.app_key, c.app_label);
  const me = account?.toLowerCase();
  const isAdvocate = me === c.advocate.toLowerCase();
  const loserAddr = c.contest.loser === "ADVOCATE" ? c.advocate : c.contest.loser === "RESPONDENT" ? c.respondent : "";
  const isLoser = Boolean(me) && me === loserAddr.toLowerCase();
  const judged = c.judged_at > 0;
  const hot = hotWords(c, config);
  const owed = BigInt(c.settlement.locked_wei || "0") > 0n;

  return (
    <AppShell>
      <Link href="/challenges" className="mono muted" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: "0.82rem", marginBottom: 18 }}><ArrowLeft size={14} /> All results</Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <AppGlyph name={name} size={56} color={c.outcome ? verdictColor(c.outcome) : "var(--cyan)"} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="eyebrow">Challenge #{c.challenge_id}</div>
          <h1 style={{ margin: "6px 0 8px", fontSize: "clamp(1.5rem, 4vw, 2.1rem)" }}>{name}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PlatformBadge platform={c.platform} />
            <StatusBadge status={c.status} />
            {c.outcome && <VerdictBadge outcome={c.outcome} />}
          </div>
        </div>
        <a href={storeUrl(c.app_key, c.fetch_url)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> Store listing</a>
      </div>

      <div className="split" style={{ marginBottom: 16 }}>
        <Party side="advocate" address={c.advocate} stake={c.advocate_stake_wei}>
          <div className="label">The claim</div>
          <p className="mono" style={{ margin: 0, fontSize: "1rem" }}>&ldquo;{c.claim}&rdquo;</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            <span className="chip" style={{ color: c.claim_reading.negative ? "var(--hot)" : "var(--green)" }}>{c.claim_reading.negative ? "Denial" : "Assertion"}</span>
            <span className="chip">{AXIS_LABEL[c.claim_reading.axis] ?? c.claim_reading.axis}</span>
            {c.claim_reading.topics.map((t) => <span key={t} className="chip" style={{ color: "var(--cyan)" }}>{config?.topics.find((x) => x.key === t)?.label ?? t}</span>)}
          </div>
          {c.status === "FILED" && isAdvocate && (
            <div style={{ marginTop: 16 }}>
              <TxButton className="btn btn-ghost" label="Withdraw (full refund)" icon={<Undo2 size={16} />} run={(acc) => withdrawChallenge(acc, c.challenge_id)} onDone={refresh} />
            </div>
          )}
        </Party>
        <Party side="developer" address={c.respondent} stake={c.respondent_stake_wei}>
          {c.status === "FILED" ? (
            c.phase === "DEFAULT_AVAILABLE" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <p className="dim" style={{ margin: 0 }}>Nobody defended this claim within the response window. The advocate wins by default.</p>
                <TxButton label="Apply default judgment" icon={<Gavel size={16} />} run={(acc) => defaultJudgment(acc, c.challenge_id)} onDone={refresh} />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div className="chip" style={{ color: "var(--amber)", justifySelf: "start" }}><Hourglass size={13} /> respond within {duration(c.respond_by - now)}</div>
                {isAdvocate ? <p className="muted" style={{ margin: 0 }}>You filed this challenge, so you cannot respond to it.</p> : <RespondForm c={c} refresh={refresh} />}
              </div>
            )
          ) : c.respondent && c.respondent !== ZERO ? (
            <>
              <div className="label">The defence</div>
              <p style={{ margin: 0 }}>{c.response}</p>
              {c.policy_url && <a href={c.policy_url} target="_blank" rel="noreferrer" className="hash" style={{ display: "inline-flex", gap: 6, marginTop: 10, color: "var(--lavender)" }}>{c.policy_url} <ExternalLink size={12} /></a>}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No response was filed.</p>
          )}
        </Party>
      </div>

      {c.status === "RESPONDED" && (
        <div style={{ display: "grid", gap: 14, marginBottom: 16 }}>
          <PrivacyScan lines={[`render ${c.fetch_url.replace("https://", "")}`, "extract & canonicalise the privacy section", "compare declarations against the claim", "agree on the findings vector"]} />
          <div className="glass panel" style={{ display: "grid", gap: 12 }}>
            <p className="dim" style={{ margin: 0 }}>Anyone can trigger judgment. Five validators render the listing independently and must agree on every finding before anything is stored.</p>
            <TxButton label="Trigger judgment" icon={<Radar size={16} />} waitingLabel="Validators reading the listing…" run={(acc) => judge(acc, c.challenge_id)} onDone={refresh} />
            {c.phase === "STALL_AVAILABLE" && (
              <TxButton className="btn btn-ghost" label="Settle as stalled (refund both)" icon={<RotateCcw size={16} />} run={(acc) => settleStalled(acc, c.challenge_id)} onDone={refresh} />
            )}
            {c.judge_attempts > 0 && <span className="mono muted" style={{ fontSize: "0.76rem" }}>{c.judge_attempts} attempt(s) without an agreed reading so far</span>}
          </div>
        </div>
      )}

      {judged && (
        <div style={{ display: "grid", gap: 16, marginBottom: 16 }}>
          <VerdictReveal outcome={c.outcome} strength={c.evidence_strength} reason={c.reason} />
          <div className="split">
            <Section icon={Layers} title="Data categories on the listing">
              <CategoryTags rows={c.findings.categories} hot={hot.length ? hot.map((w) => w) : []} />
              <div style={{ marginTop: 18 }}><StrengthGauge value={c.evidence_strength} color={verdictColor(c.outcome)} /></div>
            </Section>
            <Section icon={FileSearch} title="What the bracket allowed">
              <p style={{ margin: 0 }}>{CASE_LABEL[c.case] ?? c.case}.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0" }}>
                {c.allowed.map((a) => <VerdictBadge key={a} outcome={a} />)}
              </div>
              <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
                Computed by the contract from the page before any model was asked. {c.model_called ? "The validators' models chose inside it." : "Only one verdict was possible, so no model was called."}
              </p>
            </Section>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, alignItems: "start" }}>
            <Section icon={Radar} title={`Tracking declared (${c.findings.tracking.length})`}>
              <CategoryTags rows={c.findings.tracking} hot={c.claim_reading.axis === "track" ? hot : []} empty={c.platform === "google_play" ? "Google Play publishes no tracking declaration" : "None declared"} />
            </Section>
            <Section icon={Share2} title={`Sharing declared (${c.findings.sharing.length})`}>
              <CategoryTags rows={c.findings.sharing} hot={c.claim_reading.axis !== "collect" ? hot : []} empty="No data shared" />
            </Section>
            <Section icon={Eye} title={`Collection declared (${c.findings.collection.length})`}>
              <CategoryTags rows={c.findings.collection} hot={c.claim_reading.axis === "collect" ? hot : []} empty="No data collected" />
            </Section>
          </div>
          <Section icon={Hash} title="Exactly what the validators read">
            <pre className="privacy">{c.privacy_text || "(no privacy section)"}</pre>
            <div style={{ display: "grid", gap: 4, marginTop: 12 }}>
              <span className="hash">page state · {c.page_state}</span>
              <span className="hash">section hash · {c.section_hash}</span>
              <span className="hash">content hash · {c.content_hash}  (URL + claim + privacy text + findings + verdict)</span>
            </div>
          </Section>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Section icon={Scale} title="Settlement">
          <Settlement c={c} />
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {c.phase === "FINALIZE_AVAILABLE" && (
              <TxButton label="Finalize verdict" icon={<ShieldCheck size={16} />} run={(acc) => finalize(acc, c.challenge_id)} onDone={refresh} />
            )}
            {["FINALIZED", "DEFAULTED", "WITHDRAWN", "STALLED"].includes(c.status) && owed && (
              <TxButton label="Pay out every party" icon={<Wallet size={16} />} run={(acc) => claimPayout(acc, c.challenge_id)} onDone={refresh} />
            )}
          </div>
        </Section>
        <Section icon={Clock} title="Timeline"><Timeline c={c} /></Section>
        {judged && <Section icon={BadgeCheck} title="Verify"><Verify c={c} /></Section>}
      </div>

      {(c.status === "SETTLED" || c.contest.result) && (
        <div className="glass panel" style={{ marginTop: 16, borderColor: "rgba(255,184,0,.4)" }}>
          <div className="eyebrow" style={{ color: "var(--amber)", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><Swords size={14} /> Contest</div>
          {c.contest.result ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className="chip" style={{ color: c.contest.result === "FLIPPED" ? "var(--green)" : "var(--amber)" }}>{c.contest.result === "FLIPPED" ? "Verdict flipped" : "Verdict held"}</span>
                <VerdictBadge outcome={c.contest.original_outcome} /> <span className="muted">→</span> <VerdictBadge outcome={c.contest.outcome} />
              </div>
              <div className="label" style={{ marginTop: 6 }}>New evidence ({c.contest.by === "ADVOCATE" ? "advocate" : "developer"})</div>
              <p style={{ margin: 0 }}>{c.contest.evidence}</p>
              <span className="hash">re-read content hash · {c.contest.content_hash}</span>
            </div>
          ) : c.phase === "CONTEST_WINDOW" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <p className="dim" style={{ margin: 0 }}>
                The losing party ({c.contest.loser === "ADVOCATE" ? "advocate" : "developer"}) can contest for another {duration(c.contest.window_ends - now)} with new evidence and a {gen(c.contest.stake_required_wei)} GEN stake. Validators re-render the listing; if the verdict changes, the stake comes back.
              </p>
              {isLoser ? <ContestForm c={c} refresh={refresh} /> : <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>Connect the losing party&apos;s wallet to contest.</p>}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>The contest window has closed.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
