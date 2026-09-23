"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, Coins, FileText, Lock, MapPin, MessageSquare, Scale, Search, Shield, ShieldAlert, ShieldPlus, ListChecks, Cpu, Calculator,
} from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { HeroVisual } from "@/components/HeroVisual";
import { CountUp, PageShell, Reveal } from "@/components/Motion";
import { useStats } from "@/lib/hooks";

const STEPS = [
  { icon: Shield, title: "Challenge", text: "File a claim about an app's privacy and stake GEN on the listing contradicting it." },
  { icon: MessageSquare, title: "Respond", text: "The developer defends their listing with a matching stake within 48 hours." },
  { icon: Search, title: "Verify", text: "Validators fetch the store page independently and read its privacy section." },
  { icon: Scale, title: "Settle", text: "Money moves to whoever was right, by arithmetic nobody can argue with." },
];

const WHY = [
  { icon: Lock, title: "Trustless", text: "Five validators. No admin. No appeals committee." },
  { icon: FileText, title: "Evidence-based", text: "The store listing is the evidence. The content hash pins exactly what was read." },
  { icon: Coins, title: "Staked", text: "Both sides put money down. Lies cost real GEN." },
];

function StatsBanner() {
  const { data } = useStats();
  const tested = data?.judgments ?? 0;
  const contradicted = data?.verdict_counts?.CONTRADICTED ?? 0;
  const apps = data?.apps ?? 0;
  const items = [
    { icon: ListChecks, value: tested, label: "claims tested" },
    { icon: ShieldAlert, value: contradicted, label: "contradictions found", color: "var(--hot)" },
    { icon: Shield, value: apps, label: "apps audited" },
  ];
  return (
    <div className="glass pulse" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 1, overflow: "hidden", borderColor: "rgba(0,229,255,.35)" }}>
      {items.map(({ icon: Icon, value, label, color }) => (
        <div key={label} style={{ padding: "20px 18px", display: "flex", gap: 14, alignItems: "center", background: "rgba(13,13,26,.35)" }}>
          <Icon size={22} color={color ?? "var(--cyan)"} />
          <div>
            <div className="mono" style={{ fontSize: "1.7rem", fontWeight: 800, color: color ?? "var(--text)", lineHeight: 1 }}>
              {data ? <CountUp value={value} /> : "—"}
            </div>
            <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div>
      <header className="container" style={{ display: "flex", alignItems: "center", height: 70, gap: 16 }}>
        <Wordmark />
        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href="/docs" className="btn btn-sm btn-ghost hide-sm"><FileText size={14} /> Docs</Link>
          <Link href="/challenges" className="btn btn-sm btn-ghost"><ListChecks size={14} /> Results</Link>
        </nav>
      </header>
      <PageShell>
        <section style={{ position: "relative", minHeight: "calc(100dvh - 70px)", display: "flex", alignItems: "center" }}>
          <div className="grid-bg" />
          <div className="container" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40, alignItems: "center", padding: "30px 16px 60px" }}>
            <div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow" style={{ marginBottom: 18 }}>
                Privacy claims · verified on GenLayer
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ fontSize: "clamp(2.1rem, 6vw, 3.6rem)", lineHeight: 1.05, margin: 0 }}
              >
                Apps lie about your privacy.{" "}
                <span style={{ color: "var(--cyan)", textShadow: "0 0 30px rgba(0,229,255,.45)" }}>Now you can prove it.</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="dim" style={{ fontSize: "1.1rem", margin: "20px 0 30px", maxWidth: 520 }}>
                Validators read the store listing. The listing doesn&apos;t lie.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/challenge" className="btn btn-primary"><ShieldPlus size={16} /> Challenge an app</Link>
                <Link href="/challenges" className="btn btn-ghost"><ListChecks size={16} /> Browse results</Link>
              </motion.div>
            </div>
            <HeroVisual />
          </div>
        </section>

        <section className="container" style={{ marginTop: -20 }}>
          <Reveal><StatsBanner /></Reveal>
        </section>

        <section className="container" style={{ marginTop: 90 }}>
          <Reveal>
            <div className="eyebrow">How it works</div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.1rem)", margin: "10px 0 28px" }}>Four steps. One of them needs judgment.</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="glass glass-hover panel" style={{ height: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <motion.span whileHover={{ rotate: -8, scale: 1.1 }} style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--cyan-dim)", border: "1px solid rgba(0,229,255,.35)" }}>
                      <Icon size={20} color="var(--cyan)" />
                    </motion.span>
                    <span className="mono muted">0{i + 1}</span>
                  </div>
                  <h3 style={{ margin: "16px 0 6px", fontSize: "1.1rem" }}>{title}</h3>
                  <p className="dim" style={{ margin: 0, fontSize: "0.9rem" }}>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="container" style={{ marginTop: 90 }}>
          <Reveal>
            <div className="glass panel" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              <div>
                <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}><Cpu size={14} /> GenLayer does</div>
                <p style={{ margin: "10px 0 0" }}>
                  Read a privacy claim in English against the data-safety declarations the app&apos;s own listing publishes, and decide whether the listing <b>contradicts</b>, <b>supports</b> or <b>does not address</b> it.
                </p>
              </div>
              <div>
                <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--lavender)" }}><Calculator size={14} /> Deterministic code does</div>
                <p style={{ margin: "10px 0 0" }}>
                  Parse the URL, extract and canonicalise the privacy section, bound the allowed verdicts, hash what was read, split the stakes 80/10/10, refund, and pay. No model touches a wei.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="container" style={{ marginTop: 90 }}>
          <Reveal>
            <div className="eyebrow">Why AppAudit</div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.1rem)", margin: "10px 0 28px" }}>Nobody to lobby. Nothing to edit after the fact.</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {WHY.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="glass glass-hover panel" style={{ height: "100%" }}>
                  <Icon size={24} color="var(--lavender)" />
                  <h3 style={{ margin: "14px 0 6px" }}>{title}</h3>
                  <p className="dim" style={{ margin: 0, fontSize: "0.92rem" }}>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="container" style={{ marginTop: 90 }}>
          <Reveal>
            <div className="eyebrow">A real verdict</div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.1rem)", margin: "10px 0 24px" }}>&ldquo;WhatsApp does not collect location.&rdquo;</h2>
            <div className="split">
              <div className="glass panel" style={{ borderColor: "rgba(0,229,255,.4)" }}>
                <div className="eyebrow">The claim</div>
                <p className="mono" style={{ fontSize: "1.05rem", margin: "12px 0 0" }}>This app does not collect location data</p>
                <p className="muted" style={{ fontSize: "0.85rem", margin: "14px 0 0" }}>Read by the contract as: a DENIAL about data collection of Location.</p>
              </div>
              <div className="glass panel" style={{ borderColor: "rgba(255,51,102,.5)" }}>
                <div className="eyebrow" style={{ color: "var(--hot)" }}>The listing · Google Play data safety</div>
                <div className="mono" style={{ margin: "12px 0", display: "flex", gap: 8, alignItems: "center", color: "var(--hot)" }}>
                  <MapPin size={16} /> Location · Approximate location
                </div>
                <span className="chip" style={{ color: "var(--hot)", borderColor: "var(--hot)" }}><ShieldAlert size={13} /> Contradicted · strength 7/7</span>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <Link href="/challenges" className="btn btn-ghost">See every verdict on chain <ArrowRight size={15} /></Link>
            </div>
          </Reveal>
        </section>

        <section className="container" style={{ marginTop: 90, textAlign: "center" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.1rem)", margin: 0 }}>Found a claim that doesn&apos;t match the listing?</h2>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
              <Link href="/challenge" className="btn btn-primary"><ShieldPlus size={16} /> Challenge an app</Link>
              <Link href="/challenges" className="btn btn-ghost"><ListChecks size={16} /> Browse results</Link>
            </div>
          </Reveal>
        </section>
      </PageShell>
      <Footer />
    </div>
  );
}
