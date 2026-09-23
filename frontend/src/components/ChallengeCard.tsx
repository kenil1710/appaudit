"use client";

import Link from "next/link";
import { Coins, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { PlatformBadge, StatusBadge, VerdictBadge } from "./Badges";
import { appName, ago, gen, verdictColor } from "@/lib/format";
import type { ChallengeCard as Card } from "@/lib/types";

export function AppGlyph({ name, color = "var(--cyan)", size = 40 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="mono"
      style={{
        width: size, height: size, borderRadius: size * 0.28, display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: `color-mix(in srgb, ${color} 14%, #12121f)`, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        color, fontWeight: 800, fontSize: size * 0.42, flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function ChallengeCardView({ c, index = 0 }: { c: Card; index?: number }) {
  const name = appName(c.app_key, c.app_label);
  const stake = BigInt(c.advocate_stake_wei || "0") + BigInt(c.respondent_stake_wei || "0");
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.04 }}>
      <Link href={`/challenge/${c.challenge_id}`} className="glass glass-hover" style={{ display: "block", padding: 18, height: "100%" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AppGlyph name={name} color={c.outcome ? verdictColor(c.outcome) : "var(--cyan)"} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="mono" style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div className="muted mono" style={{ fontSize: "0.72rem" }}>#{c.challenge_id} · {ago(c.filed_at)}</div>
          </div>
          <PlatformBadge platform={c.platform} />
        </div>
        <p style={{ margin: "14px 0", fontSize: "0.92rem", display: "flex", gap: 8 }}>
          <Quote size={14} color="var(--lavender)" style={{ flexShrink: 0, marginTop: 4 }} />
          <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.claim}</span>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {c.outcome ? <VerdictBadge outcome={c.outcome} /> : null}
          <StatusBadge status={c.status} />
          <span className="chip" style={{ marginLeft: "auto", color: "var(--cyan)" }}>
            <Coins size={13} /> {gen(stake.toString())} GEN
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
