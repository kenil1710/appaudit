"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Apple, BookOpen, Calculator, Code2, Cpu, ExternalLink, HelpCircle, Rocket, Scale, Search, ShieldPlus, Smartphone, Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useConfig } from "@/lib/hooks";
import { CANONICAL_ADDRESS, CONSUMER_ADDRESS, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { duration, gen } from "@/lib/format";

const TOC = [
  { id: "start", label: "Getting started", icon: Rocket },
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
    <AppShell eyebrow="Documentation" title="How AppAudit works" blurb="Everything the contract decides, and exactly which part of it GenLayer decides.">
      <div className="docs-grid">
        <nav className="glass panel docs-nav" style={{ display: "grid", gap: 4 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}><BookOpen size={12} style={{ verticalAlign: -1 }} /> Contents</div>
          {TOC.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`} className="mono" style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 6px", fontSize: "0.82rem", color: "var(--text-2)" }}><Icon size={14} /> {label}</a>
          ))}
        </nav>
        <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
          <Block id="start" icon={Rocket} title="Getting started">
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
