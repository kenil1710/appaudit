"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Apple, BadgeCheck, BookOpen, Calculator, Camera, Code2, Coins, Cpu, ExternalLink, GitCompareArrows, HelpCircle, Lock, Rocket, Scale, ScrollText, Search, ShieldPlus, Smartphone, Sparkles, Store, Wrench } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useConfig } from "@/lib/hooks";
import { CANONICAL_ADDRESS, CONSUMER_ADDRESS, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { duration, gen } from "@/lib/format";
import { V2_ADDRESS, V2_CANONICAL_ADDRESS, V2_CONSUMER_ADDRESS } from "@/lib/v2";

const TOC = [
  { id: "v2", label: "What's new in v2", icon: Sparkles },
  { id: "cross", label: "Cross-store mismatch", icon: GitCompareArrows },
  { id: "policy", label: "Policy vs label", icon: ScrollText },
  { id: "developer", label: "Verified developer", icon: BadgeCheck },
  { id: "frozen", label: "Frozen evidence · CORRECTED", icon: Wrench },
  { id: "timeline", label: "Snapshots & timeline", icon: Camera },
  { id: "payouts", label: "Pull payouts", icon: Coins },
  { id: "never", label: "What the model never decides", icon: Lock },
  { id: "v2integrate", label: "app_record for marketplaces", icon: Code2 },
  { id: "start", label: "v1 · Getting started", icon: Rocket },
  { id: "how", label: "How challenges work", icon: ShieldPlus },
  { id: "check", label: "What validators check", icon: Search },
  { id: "platforms", label: "Google Play vs App Store", icon: Store },
  { id: "money", label: "Settlement math", icon: Calculator },
  { id: "integrate", label: "Integration guide", icon: Code2 },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

function Block({ id, icon: Icon, title, children }: { id: string; icon: typeof Rocket; title: string; children: ReactNode }) {
  return (
    <section id={id} className="glass panel" style={{ scrollMarginTop: 90 }}>
      <h2 style={{ display: "flex", gap: 10, alignItems: "center", margin: "0 0 14px", fontSize: "1.25rem" }}><Icon size={20} color="var(--cyan)" /> {title}</h2>
      <div className="dim" style={{ display: "grid", gap: 12, fontSize: "0.94rem" }}>{children}</div>
    </section>
  );
}

const code: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--cyan)" };

export default function Docs() {
  const { data: c } = useConfig();
  const minStake = gen(c?.min_stake_wei ?? "500000000000000000");
  const contestStake = gen(c?.contest_stake_wei ?? "300000000000000000");
  return (
    <AppShell eyebrow="Documentation" title="How AppAudit works" blurb="Everything the contracts decide, and exactly which part of it GenLayer decides. v2 first; the v1 reference follows.">
      <div className="docs-grid">
        <nav className="glass panel docs-nav" style={{ display: "grid", gap: 4 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}><BookOpen size={12} style={{ verticalAlign: -1 }} /> Contents</div>
          {TOC.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`} className="mono" style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 6px", fontSize: "0.82rem", color: "var(--text-2)" }}><Icon size={14} /> {label}</a>
          ))}
        </nav>
        <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
          <Block id="v2" icon={Sparkles} title="What's new in v2">
            <p style={{ margin: 0 }}>v1 tests one English claim against one store listing. <b>v2 keeps that</b> (as the &ldquo;claim vs label&rdquo; kind, same rules) and tests an app&apos;s declarations <b>against each other</b>: the Google Play label against the App Store label, and the privacy policy the listing links to against the label. It adds verified developers, evidence frozen at filing, a label timeline and pull payouts.</p>
            <div className="hash">v2 demo instance (this app; 10-minute windows) · {V2_ADDRESS}</div>
            <div className="hash">v2 canonical instance (48h / 24h / 48h, 300s cooldown) · {V2_CANONICAL_ADDRESS}</div>
            <div className="hash">AppTrustConsumerV2 · {V2_CONSUMER_ADDRESS}</div>
            <p style={{ margin: 0 }}>Start at <Link href="/v2/file" style={{ color: "var(--cyan)" }}>File a case</Link>. Every case walks FILED → RESPONDED → SETTLED → FINALIZED; every wait has a deadline and a permissionless exit: <span style={code}>default_judgment</span> after the response window, <span style={code}>settle_stalled</span> after the stall window, <span style={code}>finalize</span> after the contest window.</p>
          </Block>

          <Block id="cross" icon={GitCompareArrows} title="Cross-store mismatch">
            <p style={{ margin: 0 }}>Name one data type from the frozen list, a collection or sharing axis, and both listings. At filing, every validator renders <b>both labels</b> (canonical, sorted form) and GETs <b>both listings&apos; HTML</b> for their title, developer name and website. The filing is refused unless the two are the <b>same app</b>: the titles match <b>exactly</b> after dropping case, punctuation and ™/® (a store subtitle after &ldquo;:&rdquo; or &ldquo; - &rdquo; may differ: &ldquo;CapCut - Video Editor&rdquo; = &ldquo;CapCut: Photo &amp; Video Editor&rdquo;), <b>and</b> the developer is the same — the same normalised name (&ldquo;Snap Inc&rdquo; = &ldquo;Snap, Inc.&rdquo;) or the same own website host (shared hosts such as github.io or sites.google.com never count). &ldquo;Facebook Lite&rdquo; is not &ldquo;Facebook&rdquo;, &ldquo;Google Drive&rdquo; is not &ldquo;Google Photos&rdquo;, Messenger is not Facebook.</p>
            <p style={{ margin: 0 }}><b>Code</b> compares: one store declares the type and the other states, in terms, that nothing is collected / shared → <b style={{ color: "var(--hot)" }}>contradicted</b>. Both say the same explicit thing → <b style={{ color: "var(--green)" }}>consistent</b>. One store silent → <b>inconclusive</b>: silence is never evidence. No model is asked. The App Store publishes no sharing declaration, so its &ldquo;Data Used to Track You&rdquo; list stands in for sharing, and every such case says so.</p>
          </Block>

          <Block id="policy" icon={ScrollText} title="Policy vs label">
            <p style={{ margin: 0 }}>The policy is <b>the one the listing links to</b>, found by validators in the listing&apos;s HTML at filing — there is no parameter for it — and frozen onto the case; judgment reads the same URL. A policy over {(120000).toLocaleString()} characters, unreadable, or not linked is refused at filing, so no stake is ever locked on evidence that can only be inconclusive.</p>
            <p style={{ margin: 0 }}>The model reads the policy as <b>untrusted data</b> between markers (any line that would close the marker is rewritten first) and returns only a fixed enum per data type — <span style={code}>SHARED</span>, <span style={code}>COLLECTED</span> or <span style={code}>NOT_MENTIONED</span> — plus the words it relied on. <b>Code</b> checks those words appear verbatim in the policy it fetched (else that entry becomes NOT_MENTIONED) and <b>expands them to the whole sentence(s) around them</b>, so a &ldquo;not&rdquo; or an &ldquo;except&rdquo; can never be cut off; every validator checks the leader&apos;s quote is verbatim <i>and</i> a run of whole sentences of its own fetch. Policy says SHARED, label says &ldquo;No data shared&rdquo; → contradicted. Only the enum, a SHA-256 of the quote and a SHA-256 of the whole policy text are stored; the page shows the quote by finding the sentence with that hash in the live policy (fetched only from the case&apos;s own policy URL).</p>
          </Block>

          <Block id="developer" icon={BadgeCheck} title="Verified developer">
            <p style={{ margin: 0 }}><Link href="/v2/developer" style={{ color: "var(--cyan)" }}>register_developer(app)</Link>: validators read the developer website <b>off the listing</b> and fetch <span style={code}>https://&lt;that host&gt;/.well-known/appaudit.txt</span>. It must answer 200 and contain the caller&apos;s full address. From then on only that wallet can respond to or contest cases about that listing; apps without one keep v1 behaviour and every case shows <b>respondent unverified</b>.</p>
            <p style={{ margin: 0 }}>Re-verification (new file, new wallet, new host) is allowed once per cooldown and every event is kept. <span style={code}>recheck_developer</span> is permissionless and revokes only on <b>positive evidence</b>: the listing read and linking a different host, or the file loading (HTTP 200) without the wallet. A failed read — the store page down, the file erroring or missing — changes nothing, and after a revoke the developer may register again at once. Rechecks keep their own clock, so nobody can recheck a developer out of re-verifying.</p>
          </Block>

          <Block id="frozen" icon={Wrench} title="Evidence frozen at filing · CORRECTED">
            <p style={{ margin: 0 }}>Every filing is a consensus round that captures the evidence — the canonical labels, the policy enum — and stores its hash and a compact canonical copy. Judgment fetches everything again.</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              <li>Contradiction at filing <b>and</b> at judgment → <b style={{ color: "var(--hot)" }}>CONTRADICTED</b>.</li>
              <li>At filing, gone at judgment, the evidence <b>for that data type</b> changed (its status on the label, or the policy text itself), still readable, and the filing capture <b>confirmed</b> → <b style={{ color: "var(--amber)" }}>CORRECTED</b>: the advocate wins, and the record shows both captures and dates.</li>
              <li>The same, but the filing capture never confirmed → INCONCLUSIVE, stakes back. Confirm with a paid snapshot before filing, or <span style={code}>confirm_filing(id)</span> (anyone) before judgment. An edit to the linked policy needs no confirmation: deleting or padding the admission is CORRECTED, never a refund.</li>
              <li>Not at filing → the normal rules. An unreadable listing at judgment is not a fix; it is inconclusive.</li>
            </ul>
            <p style={{ margin: 0 }}>An edit elsewhere on the label, or a model reading an unchanged policy differently, is never a change. Duplicates are refused per advocate, so no one can hold a question hostage.</p>
          </Block>

          <Block id="timeline" icon={Camera} title="Snapshots & timeline">
            <p style={{ margin: 0 }}><Link href="/v2/timeline" style={{ color: "var(--cyan)" }}>snapshot(app)</Link>: anyone, for a fee and no stake, records a listing&apos;s current canonical label (at most 4 per listing per UTC day). Filings and judgments add a free snapshot only when the label changed. <span style={code}>timeline(app, offset, limit)</span> pages through every snapshot, newest first, with the diff against the previous one computed by the contract: data types added or removed per declaration.</p>
          </Block>

          <Block id="payouts" icon={Coins} title="Pull payouts">
            <p style={{ margin: 0 }}>No v2 path pushes value. Settlement credits <b>claimable balances</b>; <Link href="/v2/balance" style={{ color: "var(--cyan)" }}>withdraw()</Link> zeroes the caller&apos;s balance and then sends it, so a second call finds nothing. Protocol fees go to the fee recipient&apos;s own balance (<span style={code}>withdraw_fees</span>). The books publish <span style={code}>balance == open stakes + claimable + protocol fees</span>, checked offline after every transaction. Studio Dev queues value transfers without executing them (measured for both stages), which the stats report as undelivered.</p>
          </Block>

          <Block id="never" icon={Lock} title="What the model never decides">
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              <li>Which pages are read — URLs are rebuilt from app ids or read off the listing.</li>
              <li>Whether two listings are the same app, or who the developer is.</li>
              <li>Whether a label declares, denies or is silent about a data type.</li>
              <li>Whether a quote is real — code checks it verbatim.</li>
              <li>Any verdict of the cross-store or policy kinds — code compares the enum with the label.</li>
              <li>CORRECTED, the timeline diffs, any amount, any balance, any transfer.</li>
            </ul>
            <p style={{ margin: 0 }}>The model does two things only: the v1 claim reading (inside v1&apos;s evidence bracket), and classifying a policy into the fixed enum.</p>
          </Block>

          <Block id="v2integrate" icon={Code2} title="app_record for marketplaces">
            <pre className="privacy">{`consumerV2.app_record(app_url) -> {
  contradicted, verified, corrected, inconclusive,   # FINAL verdicts only
  verified_developer, developer_wallet,
  last_snapshot_at, snapshots, trust_score
}
# score = 70 + 10*verified - 35*contradicted - 10*corrected + 5 if verified developer
# custody false, zero payable methods, no transfers`}</pre>
            <div className="hash">AppTrustConsumerV2 · {V2_CONSUMER_ADDRESS}</div>
          </Block>

          <Block id="start" icon={Rocket} title="v1 · Getting started">
            <p style={{ margin: 0 }}>AppAudit runs on <b>GenLayer Studio Devnet</b> (chain 61997). Studio is faucet-funded: add the network from the wallet button (the app switches you automatically), then fund your address from the <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>Studio faucet <ExternalLink size={11} /></a>.</p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              <li>Install MetaMask (or any EIP-1193 wallet).</li>
              <li>Open <Link href="/challenge" style={{ color: "var(--cyan)" }}>Challenge</Link> and press <b>Connect wallet</b> — the app adds and switches to Studio Devnet.</li>
              <li>Paste a Google Play or App Store listing URL and the claim you want tested.</li>
            </ol>
            <div className="hash">app instance (demo windows) · {CONTRACT_ADDRESS}</div>
            {CANONICAL_ADDRESS && <div className="hash">canonical instance (48h / 24h / 48h) · {CANONICAL_ADDRESS}</div>}
          </Block>

          <Block id="how" icon={ShieldPlus} title="How challenges work">
            <p style={{ margin: 0 }}><b>A privacy advocate</b> files a claim about an app — &ldquo;This app does not collect location data&rdquo; — names its store listing, and stakes at least {minStake} GEN. One filing per wallet per {c?.file_cooldown_s ?? 300}s, and the same claim about the same app cannot be live twice.</p>
            <p style={{ margin: 0 }}><b>An app developer</b> (or anyone but the advocate) defends the claim within {duration(c?.response_window_s ?? 172800)} by counter-staking at least {minStake} GEN. Until then the advocate may withdraw for a full refund.</p>
            <p style={{ margin: 0 }}><b>Anyone</b> triggers judgment. Validators render the listing and agree on a verdict. The losing side may <b>contest</b> once within {duration(c?.contest_window_s ?? 86400)} with new evidence and exactly {contestStake} GEN; validators re-read the page. After the window, anyone may finalize and pay out.</p>
            <p style={{ margin: 0 }}><b>Recovery paths:</b> no response → <span style={code}>default_judgment</span> (advocate refunded). No agreed judgment within {duration(c?.stall_ttl_s ?? 172800)} of the response → <span style={code}>settle_stalled</span> refunds both, and works while paused. Value sent with any refused call → <span style={code}>claim_refund</span>.</p>
          </Block>

          <Block id="check" icon={Search} title="What validators check">
            <p style={{ margin: 0 }}><b style={{ color: "var(--cyan)" }}><Cpu size={14} style={{ verticalAlign: -2 }} /> GenLayer does</b> one thing: read the claim against the privacy declarations and decide whether the listing contradicts, supports, or does not address it — including qualifiers a keyword match cannot (&ldquo;precise&rdquo; vs &ldquo;approximate&rdquo; location).</p>
            <p style={{ margin: 0 }}><b style={{ color: "var(--lavender)" }}><Calculator size={14} style={{ verticalAlign: -2 }} /> Deterministic code does</b> the rest: rebuild the page URL from the app id, render and extract the privacy section, <b>sort it into a canonical form</b> (Google Play reorders entries on every render), list categories, and decide which verdicts are even <i>allowed</i>:</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
              <li><b>Direct</b> — the claimed data type is declared on the claimed axis: the matching verdict or Inconclusive.</li>
              <li><b>Explicit none</b> — the listing states no data is collected/shared: the mirror verdict or Inconclusive.</li>
              <li><b>Elsewhere / absent / unreadable</b> — pinned to Inconclusive with no model call. Silence in a self-declared listing is not evidence.</li>
            </ul>
            <p style={{ margin: 0 }}>Validators compare the whole findings vector — page state, section hash, case, allowed set, four buckets, matched types, facts hash, content hash and verdict exactly; strength within one bucket. Every stored field is re-derived after consensus.</p>
          </Block>

          <Block id="platforms" icon={Store} title="Google Play vs App Store">
            <div className="split">
              <div>
                <div className="mono" style={{ color: "var(--green)", display: "flex", gap: 8, alignItems: "center" }}><Smartphone size={15} /> Google Play</div>
                <p style={{ margin: "8px 0 0" }}>Rendered from <span style={code}>/store/apps/datasafety?id=…</span> — the full list; <span style={code}>/details</span> only has a summary. Declares <b>shared</b> and <b>collected</b> data with types. It publishes <b>no tracking section</b>, so tracking claims are measured against its shared list, with a narrower strength range.</p>
              </div>
              <div>
                <div className="mono" style={{ display: "flex", gap: 8, alignItems: "center" }}><Apple size={15} /> App Store</div>
                <p style={{ margin: "8px 0 0" }}>Rendered from the US storefront&apos;s <b>App Privacy</b> label: Data Used to Track You, Data Linked / Not Linked to You. It has <b>no separate sharing section</b>, so sharing claims use the tracking list. &ldquo;No Details Provided&rdquo; is always Inconclusive.</p>
              </div>
            </div>
          </Block>

          <Block id="money" icon={Scale} title="Settlement math">
            <p style={{ margin: 0 }}>All integer arithmetic on the stakes as snapshotted when the challenge was filed. With both sides at {minStake} GEN:</p>
            <div style={{ display: "grid", gap: 6, fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
              <div><span style={{ color: "var(--hot)" }}>CONTRADICTED</span> advocate 0.5 + 0.4 = 0.9 · developer 0.05 · protocol 0.05</div>
              <div><span style={{ color: "var(--green)" }}>CLAIM_VERIFIED</span> developer 0.9 · advocate 0.05 · protocol 0.05</div>
              <div><span style={{ color: "var(--grey)" }}>INCONCLUSIVE</span> both 0.5 back · no fee</div>
              <div><span style={{ color: "var(--amber)" }}>DEFAULT</span> advocate 0.5 back · no fee</div>
              <div><span style={{ color: "var(--text-2)" }}>STALLED / WITHDRAWN</span> every stake back in full</div>
              <div><span style={{ color: "var(--amber)" }}>CONTEST</span> flipped → {contestStake} back to contester · held → {contestStake} to the winner</div>
            </div>
            <p style={{ margin: 0 }}>Shares floor; the dust stays with the loser. The owed amounts always sum to exactly what the challenge holds, and the contract publishes <span style={code}>balance == locked + refundable</span> in <span style={code}>get_stats</span>.</p>
          </Block>

          <Block id="integrate" icon={Code2} title="Integration guide for app marketplaces">
            <p style={{ margin: 0 }}><b>AppTrustConsumer</b> is the block a marketplace copies. It holds no money (custody false, zero payable methods) and reads AppAudit before listing an app:</p>
            <pre className="privacy">{`consumer.is_contradicted(app_url) -> bool
consumer.get_trust_score(app_url) -> { trust_score, counts, badge }
consumer.check_listing(app_url)   -> { listed, reason }   # view
consumer.record_listing(app_url)  -> records the decision  # write

# score = 70 + 10*verified - 35*contradicted - 5*defaulted, clamped 0..100
# only FINALIZED verdicts count: a verdict in its contest window can flip`}</pre>
            {CONSUMER_ADDRESS && <div className="hash">consumer · {CONSUMER_ADDRESS}</div>}
          </Block>

          <Block id="faq" icon={HelpCircle} title="FAQ">
            {[
              ["What if the store page changes between filing and judging?", "Validators judge the page as it is at judgment. The canonical privacy text they agreed on is stored with its hash, so anyone can see exactly what was judged. If the page changes between two validators' fetches, their hashes differ, nothing settles, and judge() simply runs again."],
              ["What if the store page is down?", "Validators must agree it is unreadable — a leader cannot fake an outage. The verdict is Inconclusive and both stakes come back. A contest against an unreadable page is not heard and cannot flip anything."],
              ["Can the contract owner freeze my stake?", "No. Pause stops new filings only. Respond, judge, contest, finalize, payouts, refunds and settle_stalled all keep working."],
              ["Can a contest just repeat the response?", "No. Sentences already in the claim, response or policy URL are removed before the 20-character minimum is checked; a copy is refused and the stake refunded."],
              ["Honest limitations", "Listings are self-declared: AppAudit tests claims against what the developer told the store, not against the app's real traffic. Keyword vocabulary decides which data types a claim names; a claim outside it is refused before staking. Studio Devnet queues finalized transfers; get_stats reports any undelivered amount."],
            ].map(([q, a]) => (
              <details key={q} className="glass" style={{ padding: "12px 14px" }}>
                <summary className="mono" style={{ cursor: "pointer", color: "var(--text)", fontSize: "0.88rem" }}>{q}</summary>
                <p style={{ margin: "10px 0 0" }}>{a}</p>
              </details>
            ))}
          </Block>
        </div>
      </div>
    </AppShell>
  );
}
