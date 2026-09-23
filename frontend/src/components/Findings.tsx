"use client";

import { motion } from "framer-motion";
import {
  Activity, Bug, Calendar, CreditCard, FileText, Fingerprint, Globe, HeartPulse, Image as ImageIcon,
  MapPin, MessageSquare, Mic, Search, ShieldQuestion, User, Users, type LucideIcon,
} from "lucide-react";

const ICONS: [string, LucideIcon][] = [
  ["location", MapPin], ["contact info", User], ["personal", User], ["contacts", Users], ["financial", CreditCard],
  ["purchase", CreditCard], ["health", HeartPulse], ["message", MessageSquare], ["photo", ImageIcon],
  ["audio", Mic], ["file", FileText], ["calendar", Calendar], ["browsing", Globe], ["web", Globe],
  ["search", Search], ["activity", Activity], ["usage", Activity], ["user content", FileText],
  ["diagnostic", Bug], ["app info", Bug], ["identifier", Fingerprint], ["device", Fingerprint], ["sensitive", ShieldQuestion],
];

export function iconFor(text: string): LucideIcon {
  const low = text.toLowerCase();
  for (const [k, I] of ICONS) if (low.includes(k)) return I;
  return ShieldQuestion;
}

/** Declared data categories, flying in one by one. `hot` rows match the claim. */
export function CategoryTags({ rows, hot = [], empty = "None declared" }: { rows: string[]; hot?: string[]; empty?: string }) {
  if (!rows.length) return <span className="muted" style={{ fontSize: "0.85rem" }}>{empty}</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {rows.map((row, i) => {
        const [cat, types] = row.split(": ");
        const Icon = iconFor(row);
        const isHot = hot.some((h) => row.toLowerCase().includes(h.toLowerCase()));
        return (
          <motion.span
            key={row}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 260, damping: 20 }}
            className="chip"
            title={types ? `${cat}: ${types}` : cat}
            style={{
              maxWidth: "100%", whiteSpace: "normal", textAlign: "left", fontWeight: 500,
              color: isHot ? "var(--hot)" : "var(--text)",
              borderColor: isHot ? "var(--hot)" : "var(--line-strong)",
              background: isHot ? "rgba(255,51,102,.1)" : "rgba(255,255,255,.03)",
              boxShadow: isHot ? "0 0 14px -4px rgba(255,51,102,.6)" : "none",
            }}
          >
            <Icon size={13} style={{ flexShrink: 0 }} />
            <span><b>{cat}</b>{types ? <span className="muted"> · {types}</span> : null}</span>
          </motion.span>
        );
      })}
    </div>
  );
}

/** 0-7 evidence strength as a segmented gauge. */
export function StrengthGauge({ value, color = "var(--cyan)" }: { value: number; color?: string }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 4 }} aria-label={`Evidence strength ${value} of 7`}>
        {Array.from({ length: 7 }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0.2, opacity: 0.2 }}
            animate={{ scaleY: 1, opacity: i < value ? 1 : 0.18 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            style={{ flex: 1, height: 12 + i * 2, alignSelf: "flex-end", borderRadius: 4, background: i < value ? color : "var(--line-strong)", boxShadow: i < value ? `0 0 10px ${color}` : "none" }}
          />
        ))}
      </div>
      <div className="mono" style={{ fontSize: "0.78rem", marginTop: 8, color: "var(--text-2)" }}>{value} / 7 · how clearly the listing addresses the claim</div>
    </div>
  );
}
