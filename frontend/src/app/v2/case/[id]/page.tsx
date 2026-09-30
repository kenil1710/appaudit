"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft, BadgeCheck, Ban, Clock, Coins, ExternalLink, Gavel, GitCompareArrows, History, Hourglass, MessageSquare,
  Quote, Radar, RotateCcw, Scale, ScrollText, Shield, ShieldCheck, Swords, Undo2, Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/States";
import { ShieldScanner } from "@/components/Scanner";
import { TxButton } from "@/components/TxButton";
import { useWallet } from "@/components/WalletProvider";
import { DevBadge, KindBadge, LabelColumn, LabelState, OutcomeBadge } from "@/components/V2";
import { useCase2, useConfig2, useVerify2 } from "@/lib/hooks2";
import { appName, duration, gen, short, toWei, when, ZERO } from "@/lib/format";
import { appUrlFromKey, OUTCOME_LABEL, tx2, type Case } from "@/lib/v2";

function Section({ icon: Icon, title, children, color }: { icon: typeof Shield; title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="glass panel" style={color ? { borderColor: color } : undefined}>
      <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, color }}><Icon size={14} /> {title}</div>
      {children}
    </div>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span className="label" style={{ margin: 0 }}>{label}</span>
      {value ? <OutcomeBadge outcome={value} /> : <span className="muted mono" style={{ fontSize: "0.78rem" }}>not yet</span>}
    </div>
  );
}

/** The policy quote is stored ON CHAIN only as a hash and a length. This asks
 *  our own server to fetch the live policy and find the sentence with that
 *  hash - so what is shown is provably the text the validators verified, or
 *  nothing at all. */
function PolicyQuote({ url, hash, len }: { url: string; hash: string; len: number }) {
  const [state, setState] = useState<{ quote?: string; error?: string } | null>(null);
  useEffect(() => {
    if (!url || !hash || !len) return;
    let live = true;
    fetch(`/api/quote?url=${encodeURIComponent(url)}&hash=${hash}&len=${len}`)
      .then((r) => r.json())
      .then((j) => { if (live) setState(j); })
      .catch((e) => { if (live) setState({ error: String(e) }); });
    return () => { live = false; };
  }, [url, hash, len]);
  if (!hash) return <p className="muted" style={{ margin: 0 }}>No quote: the policy was classified NOT_MENTIONED for this data type (or its quote was not verbatim and was demoted).</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {state?.quote ? (
        <blockquote className="mono" style={{ margin: 0, padding: "12px 14px", borderLeft: "3px solid var(--cyan)", background: "var(--cyan-dim)", borderRadius: 8, fontSize: "0.86rem" }}>
          &ldquo;{state.quote}&rdquo;
        </blockquote>
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          {state === null ? "Locating the quote in the live policy…" : `Not located in the live policy right now (${state.error ?? "the page may have changed"}). The hash below is what the validators verified.`}
        </p>
      )}
      <span className="hash">quote hash · {hash} · {len} characters · verified verbatim by every validator against the policy it fetched</span>
    </div>
  );
}

function EvidenceCross({ c }: { c: Case }) {
  const { data: config } = useConfig2();
  const topic = config?.topics.find((t) => t.key === c.topic);
  const judged = c.judged_at > 0;
  const b = c.filing.binding;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {b && (
        <Section icon={GitCompareArrows} title="Same app — checked by validators at filing">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {[["Google Play", b.play], ["App Store", b.app_store]].map(([k, m]) => {
              const x = m as { title: string; developer: string; website: string };
              return (
                <div key={k as string} style={{ display: "grid", gap: 4 }}>
                  <div className="label">{k as string}</div>
                  <span className="mono">{x.title}</span>
                  <span className="dim" style={{ fontSize: "0.85rem" }}>{x.developer}</span>
                  <span className="hash" style={{ overflowWrap: "anywhere" }}>{x.website || "no website on listing"}</span>
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.82rem" }}>Bound: {b.why}</p>
        </Section>
      )}
      <div className="eyebrow">Frozen at filing · {when(c.filing.at)}</div>
      <div className="split">
        <LabelColumn title="Google Play" sub={`hash ${c.filing.hash}`} text={c.filing.label} state={c.filing.status} topic={topic} axis={c.axis} />
        <LabelColumn title="App Store" sub={`hash ${c.filing.hash2}`} text={c.filing.label2} state={c.filing.status2} topic={topic} axis={c.axis} />
      </div>
      {judged && (<>
        <div className="eyebrow">Read again at judgment · {when(c.judgment.at)}</div>
        <div className="split">
          <LabelColumn title="Google Play" sub={`hash ${c.judgment.hash}${c.judgment.hash !== c.filing.hash ? " · CHANGED since filing" : ""}`} text={c.judgment.label} state={c.judgment.status} topic={topic} axis={c.axis} />
          <LabelColumn title="App Store" sub={`hash ${c.judgment.hash2}${c.judgment.hash2 !== c.filing.hash2 ? " · CHANGED since filing" : ""}`} text={c.judgment.label2} state={c.judgment.status2} topic={topic} axis={c.axis} />
        </div>
      </>)}
    </div>
  );
}

function EvidencePolicy({ c }: { c: Case }) {
  const { data: config } = useConfig2();
  const topic = config?.topics.find((t) => t.key === c.topic);
  const judged = c.judged_at > 0;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="split">
        <Section icon={ScrollText} title="The linked privacy policy">
          <a href={c.filing.policy_url} target="_blank" rel="noreferrer" className="hash" style={{ display: "inline-flex", gap: 6, color: "var(--lavender)", overflowWrap: "anywhere" }}>{c.filing.policy_url} <ExternalLink size={12} /></a>
          <p className="muted" style={{ fontSize: "0.8rem" }}>Read off the listing by the validators at filing; nobody supplied it. Judgment reads this same URL.</p>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="label" style={{ margin: 0 }}>{topic?.label ?? c.topic} at filing</span>
              <span className="chip" style={{ color: c.filing.policy_enum === "SHARED" ? "var(--hot)" : "var(--text-2)" }}>{c.filing.policy_enum || c.filing.policy_state}</span>
              {judged && <><span className="label" style={{ margin: 0 }}>at judgment</span>
                <span className="chip" style={{ color: c.judgment.policy_enum === "SHARED" ? "var(--hot)" : "var(--text-2)" }}>{c.judgment.policy_enum || c.judgment.policy_state}</span></>}
            </div>
            <div className="label"><Quote size={12} /> The sentence the model relied on (filing)</div>
            <PolicyQuote url={c.filing.policy_url ?? ""} hash={c.filing.quote_hash} len={c.filing.quote_len} />
            {judged && c.judgment.quote_hash && c.judgment.quote_hash !== c.filing.quote_hash && (<>
              <div className="label"><Quote size={12} /> At judgment</div>
              <PolicyQuote url={c.filing.policy_url ?? ""} hash={c.judgment.quote_hash} len={c.judgment.quote_len} />
            </>)}
          </div>
        </Section>
        <LabelColumn title={`The label at filing · ${when(c.filing.at)}`} sub={`hash ${c.filing.hash}`} text={c.filing.label} state={c.filing.status} topic={topic} axis={c.axis} />
      </div>
      {judged && (
        <LabelColumn title={`The label at judgment · ${when(c.judgment.at)}`} sub={`hash ${c.judgment.hash}${c.judgment.hash !== c.filing.hash ? " · CHANGED since filing" : ""}`} text={c.judgment.label} state={c.judgment.status} topic={topic} axis={c.axis} />
      )}
    </div>
  );
}

function EvidenceLabel({ c }: { c: Case }) {
  const judged = c.judged_at > 0;
  return (
    <div className="split">
      <LabelColumn title={`Listing at filing · ${when(c.filing.at)}`} sub={`hash ${c.filing.hash} · evidence case ${c.filing.status}`} text={c.filing.label} />
      {judged ? <LabelColumn title={`Listing at judgment · ${when(c.judgment.at)}`} sub={`hash ${c.judgment.hash} · evidence case ${c.judgment.case} · allowed ${c.judgment.allowed?.join(", ")}`} text={c.judgment.label} />
        : <div className="glass panel muted">Not judged yet.</div>}
    </div>
  );
}

function Verify({ id }: { id: number }) {
  const [on, setOn] = useState(false);
  const { data, isLoading } = useVerify2(id, on);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button className="btn btn-ghost" onClick={() => setOn(true)} disabled={on && isLoading}><BadgeCheck size={16} /> {isLoading ? "Recomputing…" : "Verify this case"}</button>
      <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>Recomputes statuses, results, the CORRECTED rule and the settlement from the stored evidence, in an on-chain view.</p>
      {data?.checks && (<>
        <span className="chip" style={{ justifySelf: "start", color: data.verified ? "var(--green)" : "var(--hot)" }}>{data.verified ? <ShieldCheck size={13} /> : <Ban size={13} />} {data.verified ? "every field recomputes" : "mismatch found"}</span>
        {data.checks.map((k) => (
          <div key={k.field} className="mono" style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.74rem", color: k.match ? "var(--text-2)" : "var(--hot)" }}>
            <span>{k.match ? "✓" : "✗"} {k.field}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>{k.recomputed}</span>
          </div>
        ))}
      </>)}
    </div>
  );
}

export default function CaseV2({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params);
  const id = Number(raw);
  const valid = Number.isInteger(id) && id > 0;
  const { data: c, error, isLoading, mutate } = useCase2(valid ? id : null);
  const { account } = useWallet();
  const [text, setText] = useState("");
  const [stake, setStake] = useState("0.5");
  const [evidence, setEvidence] = useState("");
  const refresh = () => void mutate();
  const now = Date.now() / 1000;

  if (!valid) return <AppShell title="Not a case id"><ErrorState title="That is not a case id" /></AppShell>;
  if (isLoading) return <AppShell><ShieldScanner label={`Reading case #${id}…`} /></AppShell>;
  if (error) return <AppShell><ErrorState detail={error.message} action={<button className="btn btn-sm btn-ghost" onClick={refresh}><RotateCcw size={14} /> Retry</button>} /></AppShell>;
  if (!c || !c.found) return <AppShell title={`Case #${id}`}><ErrorState title="No such case" action={<Link className="btn btn-sm btn-ghost" href="/v2">All cases</Link>} /></AppShell>;

  const me = account?.toLowerCase();
  const isAdvocate = me === c.advocate.toLowerCase();
  const loserAddr = c.contest.loser === "ADVOCATE" ? c.advocate : c.contest.loser === "RESPONDENT" ? c.respondent : "";
  const isLoser = Boolean(me) && me === loserAddr.toLowerCase();
  const gated = c.verified_developers.length > 0;
  const mayRespond = !gated || c.verified_developers.some((w) => w.toLowerCase() === me);
  const wei = toWei(stake);
  const judged = c.judged_at > 0;
  const name = appName(c.app_key, c.app_label);
  const corrected = c.outcome === "CORRECTED";

  return (
    <AppShell>
      <Link href="/v2" className="mono muted" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: "0.82rem", marginBottom: 18 }}><ArrowLeft size={14} /> All v2 cases</Link>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="eyebrow">Case #{c.challenge_id}</div>
          <h1 style={{ margin: "6px 0 8px", fontSize: "clamp(1.4rem, 4vw, 2rem)", overflowWrap: "anywhere" }}>{name}{c.app_key2 ? " · Play × App Store" : ""}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <KindBadge kind={c.kind} />
            {c.topic && <span className="chip">{c.topic} · {c.axis === "share" ? "shared" : "collected"}</span>}
            <span className="chip" style={{ color: "var(--amber)" }}>{c.status.toLowerCase()}</span>
            {c.outcome && <OutcomeBadge outcome={c.outcome} />}
            {c.respondent !== ZERO && <DevBadge verified={c.respondent_verified} label={c.respondent_label} />}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-sm btn-ghost" href={`/v2/app?key=${encodeURIComponent(c.app_key)}`}>App record</Link>
          <Link className="btn btn-sm btn-ghost" href={`/v2/timeline?app=${encodeURIComponent(c.app_key)}`}><History size={14} /> Timeline</Link>
          {c.app_key2 && <Link className="btn btn-sm btn-ghost" href={`/v2/timeline?app=${encodeURIComponent(c.app_key2)}`}><History size={14} /> App Store timeline</Link>}
        </div>
      </div>

      <div className="glass panel" style={{ marginBottom: 16, display: "grid", gap: 10 }}>
        <p className="mono" style={{ margin: 0 }}>&ldquo;{c.claim}&rdquo;</p>
        {c.axis_note && <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>{c.axis_note}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <ResultLine label="Evidence at filing" value={c.kind === "LABEL" ? "" : c.filing_result} />
          <ResultLine label="Evidence at judgment" value={c.judgment_result} />
          <ResultLine label="Verdict" value={c.outcome} />
        </div>
        {c.reason && <p className="dim" style={{ margin: 0, fontSize: "0.88rem" }}>{c.reason}</p>}
      </div>

      {corrected && (
        <Section icon={History} title="Corrected — the record of the fix" color="var(--amber)">
          <p style={{ marginTop: 0 }}>
            The contradiction was captured at filing on {when(c.filing.at)} (label hash <span className="hash">{c.filing.hash}</span>)
            and was gone at judgment on {when(c.judgment.at)} (label hash <span className="hash">{c.judgment.hash}</span>).
            The advocate&apos;s case caused the fix, so the advocate wins. Both snapshots are shown below.
          </p>
        </Section>
      )}

      <div style={{ margin: "16px 0" }}>
        {c.kind === "CROSS_STORE" ? <EvidenceCross c={c} /> : c.kind === "POLICY_LABEL" ? <EvidencePolicy c={c} /> : <EvidenceLabel c={c} />}
      </div>

      <div className="split" style={{ marginBottom: 16 }}>
        <Section icon={Shield} title="Privacy advocate" color="var(--cyan)">
          <div className="hash" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{short(c.advocate)} · <Coins size={11} /> {gen(c.advocate_stake_wei)} GEN</div>
          {c.status === "FILED" && isAdvocate && (
            <div style={{ marginTop: 12 }}><TxButton className="btn btn-ghost" label="Withdraw (full stake claimable)" icon={<Undo2 size={16} />} run={(a) => tx2.withdrawCase(a, c.challenge_id)} onDone={refresh} /></div>
          )}
        </Section>
        <Section icon={MessageSquare} title="App developer" color="var(--lavender)">
          {gated && <div style={{ marginBottom: 10 }}><DevBadge verified label={`verified developer: ${c.verified_developers.map(short).join(", ")}`} /></div>}
          {c.status === "FILED" ? (
            c.phase === "DEFAULT_AVAILABLE" ? (
              <div style={{ display: "grid", gap: 10 }}>
                <p className="dim" style={{ margin: 0 }}>Nobody responded in time. Anyone may apply the default: the advocate&apos;s stake becomes claimable.</p>
                <TxButton label="Apply default judgment" icon={<Gavel size={16} />} run={(a) => tx2.defaultJudgment(a, c.challenge_id)} onDone={refresh} />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <span className="chip" style={{ color: "var(--amber)", justifySelf: "start" }}><Hourglass size={13} /> respond within {duration(c.respond_by - now)}</span>
                {isAdvocate ? <p className="muted" style={{ margin: 0 }}>You filed this case.</p>
                  : !mayRespond ? <p className="muted" style={{ margin: 0 }}>This app has a verified developer; only that wallet can respond.</p>
                    : (<>
                      {!gated && <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>No verified developer for this app: anyone but the advocate may respond, and the case will show &ldquo;respondent unverified&rdquo;. <Link href="/v2/developer" style={{ color: "var(--cyan)" }}>Verify as the developer</Link>.</p>}
                      <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Our declarations are accurate because…" maxLength={1000} />
                      <input className="input" value={stake} onChange={(e) => setStake(e.target.value)} aria-label="Counter-stake (GEN)" />
                      <TxButton className="btn btn-lav" label="Counter-stake and respond" icon={<MessageSquare size={16} />}
                        disabled={text.trim().length < 20 || wei === null} run={(a) => tx2.respond(a, { id: c.challenge_id, text: text.trim(), stake: wei ?? 0n })} onDone={refresh} />
                    </>)}
              </div>
            )
          ) : c.respondent !== ZERO ? (
            <><div className="hash">{short(c.respondent)} · {gen(c.respondent_stake_wei)} GEN</div><p style={{ marginBottom: 0 }}>{c.response}</p></>
          ) : <p className="muted" style={{ margin: 0 }}>No response was filed.</p>}
        </Section>
      </div>

      {c.status === "RESPONDED" && (
        <div className="glass panel" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          <p className="dim" style={{ margin: 0 }}>Anyone can trigger judgment. Validators fetch the evidence again and must agree on every field. {c.kind === "POLICY_LABEL" ? "The policy is read from the URL frozen at filing." : ""}</p>
          <TxButton label="Trigger judgment" icon={<Radar size={16} />} waitingLabel="Validators re-reading the evidence…" run={(a) => tx2.judge(a, c.challenge_id)} onDone={refresh} />
          {c.phase === "STALL_AVAILABLE" && <TxButton className="btn btn-ghost" label="Settle as stalled (both stakes claimable)" icon={<RotateCcw size={16} />} run={(a) => tx2.settleStalled(a, c.challenge_id)} onDone={refresh} />}
          {c.judge_attempts > 0 && <span className="mono muted" style={{ fontSize: "0.76rem" }}>{c.judge_attempts} attempt(s) so far</span>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Section icon={Scale} title="Settlement">
          <div style={{ display: "grid", gap: 8 }}>
            {[["Advocate", c.settlement.owed_advocate_wei, "var(--cyan)"], ["Developer", c.settlement.owed_respondent_wei, "var(--lavender)"], ["Protocol", c.settlement.owed_protocol_wei, "var(--muted)"]].map(([w, v, col]) => (
              <div key={w} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)" }}>
                <span className="mono" style={{ color: col }}>{w}</span><span className="mono">{gen(v, 4)} GEN</span>
              </div>
            ))}
            <span className="mono muted" style={{ fontSize: "0.76rem" }}>
              {c.settlement.credited_to_balances ? "Credited to claimable balances — withdraw from " : "Credited to balances when the case is final — then withdraw from "}
              <Link href="/v2/balance" style={{ color: "var(--cyan)" }}>Balance</Link>. No transfer is ever pushed.
            </span>
            {c.phase === "FINALIZE_AVAILABLE" && <TxButton label="Finalize" icon={<ShieldCheck size={16} />} run={(a) => tx2.finalize(a, c.challenge_id)} onDone={refresh} />}
          </div>
        </Section>
        <Section icon={Clock} title="Deadlines">
          <div className="mono" style={{ display: "grid", gap: 6, fontSize: "0.8rem" }}>
            <span>filed · {when(c.filed_at)}</span>
            <span>respond by · {when(c.respond_by)}</span>
            {c.responded_at > 0 && <span>responded · {when(c.responded_at)} (stalls after {duration(c.windows.stall_s)})</span>}
            {judged && <span>judged · {when(c.judged_at)}</span>}
            {c.contest.window_ends > 0 && <span>contest until · {when(c.contest.window_ends)}</span>}
            {c.closed_at > 0 && <span>closed · {when(c.closed_at)}</span>}
          </div>
        </Section>
        {judged && <Section icon={BadgeCheck} title="Verify"><Verify id={c.challenge_id} /></Section>}
      </div>

      {(c.status === "SETTLED" || c.contest.result) && (
        <div className="glass panel" style={{ marginTop: 16, borderColor: "rgba(255,184,0,.4)" }}>
          <div className="eyebrow" style={{ color: "var(--amber)", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><Swords size={14} /> Contest</div>
          {c.contest.result ? (
            <p style={{ margin: 0 }}>{c.contest.result === "FLIPPED" ? "Flipped" : "Held"}: {OUTCOME_LABEL[c.contest.original_outcome] ?? c.contest.original_outcome} → {OUTCOME_LABEL[c.contest.outcome] ?? c.contest.outcome}. Evidence: {c.contest.evidence}</p>
          ) : c.phase === "CONTEST_WINDOW" ? (
            isLoser ? (
              <div style={{ display: "grid", gap: 10 }}>
                <p className="dim" style={{ margin: 0 }}>Contest within {duration(c.contest.window_ends - now)}, staking exactly {gen(c.contest.stake_required_wei)} GEN. Validators fetch the evidence again.</p>
                <textarea className="textarea" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="What changed, or what the reading missed" />
                <TxButton label="Stake and contest" icon={<Swords size={16} />} disabled={evidence.trim().length < 20}
                  run={(a) => tx2.contest(a, { id: c.challenge_id, evidence: evidence.trim(), stake: BigInt(c.contest.stake_required_wei) })} onDone={refresh} />
              </div>
            ) : <p className="muted" style={{ margin: 0 }}>The losing party ({c.contest.loser.toLowerCase()}) may contest for another {duration(c.contest.window_ends - now)}.{gated && c.contest.loser === "RESPONDENT" ? " Only the verified developer's wallet may." : ""}</p>
          ) : <p className="muted" style={{ margin: 0 }}>The contest window has closed.</p>}
        </div>
      )}

      <div className="mono muted" style={{ marginTop: 18, fontSize: "0.74rem", display: "grid", gap: 4 }}>
        <span>content hash · {c.content_hash || "—"}</span>
        <a href={appUrlFromKey(c.app_key)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 6 }}>store listing <ExternalLink size={11} /></a>
        {c.kind !== "LABEL" && <span>label status at filing: <LabelState state={c.filing.status} />{c.kind === "CROSS_STORE" && <> / <LabelState state={c.filing.status2} /></>}</span>}
        <span><Wallet size={11} /> every payout is a claimable balance</span>
      </div>
    </AppShell>
  );
}
