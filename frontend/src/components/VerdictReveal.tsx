"use client";

import { motion } from "framer-motion";
import { Lock, LockOpen } from "lucide-react";
import { VERDICT_LABEL, verdictColor } from "@/lib/format";

/** The vault: a lock that turns, splits and shows the verdict behind it. */
export function VerdictReveal({ outcome, strength, reason }: { outcome: string; strength: number; reason: string }) {
  const color = verdictColor(outcome);
  return (
    <div className="glass" style={{ position: "relative", overflow: "hidden", padding: "30px 22px", textAlign: "center", borderColor: color }}>
      <motion.div
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--card)", zIndex: 2, pointerEvents: "none" }}
      >
        <motion.div initial={{ rotate: 0 }} animate={{ rotate: [0, -25, 25, 0], scale: [1, 1.1, 1.1, 0.6] }} transition={{ duration: 1.1 }}>
          <Lock size={46} color="var(--cyan)" />
        </motion.div>
      </motion.div>
      <motion.div initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ delay: 0.9, duration: 0.6, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, transformOrigin: "left", background: "linear-gradient(90deg, var(--card), transparent)", zIndex: 1, pointerEvents: "none" }} />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, type: "spring", stiffness: 180 }}>
        <LockOpen size={28} color={color} />
        <div className="eyebrow" style={{ color, marginTop: 10 }}>Consensus verdict</div>
        <div className="mono" style={{ fontSize: "clamp(1.7rem, 6vw, 2.6rem)", fontWeight: 800, color, textShadow: `0 0 28px ${color}`, margin: "6px 0" }}>
          {VERDICT_LABEL[outcome] ?? outcome}
        </div>
        <div className="mono dim" style={{ fontSize: "0.82rem" }}>evidence strength {strength}/7</div>
        <p style={{ maxWidth: 620, margin: "14px auto 0", fontSize: "0.92rem" }}>{reason}</p>
      </motion.div>
    </div>
  );
}
