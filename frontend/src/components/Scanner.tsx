"use client";

import { motion } from "framer-motion";
import { Logomark } from "./Logo";

/** The loading state: a privacy shield being scanned. */
export function ShieldScanner({ label = "Scanning the chain…", size = 88 }: { label?: string; size?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "48px 0" }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 18px rgba(0,229,255,.45))" }}
        >
          <Logomark size={size} />
        </motion.div>
        <div className="scan-line" />
      </div>
      <span className="mono muted" style={{ fontSize: "0.82rem" }}>
        {label}
      </span>
    </div>
  );
}

/** The judging state: validators rendering the listing. */
export function PrivacyScan({ lines }: { lines: string[] }) {
  return (
    <div className="glass" style={{ position: "relative", overflow: "hidden", padding: 18 }}>
      <div className="scan-line" />
      <div className="mono" style={{ fontSize: "0.8rem", display: "grid", gap: 8 }}>
        {lines.map((l, i) => (
          <motion.div
            key={l}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: [0.35, 1, 0.35], x: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }}
            style={{ color: "var(--text-2)" }}
          >
            <span style={{ color: "var(--cyan)" }}>›</span> {l}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
