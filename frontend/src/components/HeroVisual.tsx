"use client";

import { motion } from "framer-motion";
import { MapPin, ShieldAlert, Users, Fingerprint } from "lucide-react";
import { Logomark } from "./Logo";

/** A privacy shield scanning an app's listing. */
export function HeroVisual() {
  const rows = [
    { icon: MapPin, text: "Location · Approximate location", hot: true },
    { icon: Users, text: "Contacts · Contacts", hot: false },
    { icon: Fingerprint, text: "Device or other IDs", hot: false },
  ];
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 420, margin: "0 auto", aspectRatio: "1 / 1", overflow: "hidden" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px dashed rgba(0,229,255,.25)" }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", inset: "12%", borderRadius: "50%", border: "1px dashed rgba(183,148,246,.25)" }}
      />
      <div className="glass" style={{ position: "absolute", inset: "20% 14%", padding: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#25d366,#128c7e)", display: "inline-block" }} />
          <div>
            <div className="mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>Messenger app</div>
            <div className="muted" style={{ fontSize: "0.68rem" }}>Data safety · collected</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 7 }}>
          {rows.map(({ icon: Icon, text, hot }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.35, 1, 1], color: hot ? ["#c4b5fd", "#ff3366", "#ff3366"] : "#c4b5fd" }}
              transition={{ delay: 0.6 + i * 0.5, duration: 1.2, repeat: Infinity, repeatDelay: 3 }}
              className="mono"
              style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.72rem" }}
            >
              <Icon size={13} /> {text}
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, 0] }}
          transition={{ delay: 2, duration: 3, repeat: Infinity, repeatDelay: 1.6 }}
          className="chip"
          style={{ marginTop: 12, color: "var(--hot)", borderColor: "var(--hot)" }}
        >
          <ShieldAlert size={13} /> Claim contradicted
        </motion.div>
        <div className="scan-line" />
      </div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", right: "4%", top: "6%", filter: "drop-shadow(0 0 22px rgba(0,229,255,.55))" }}
      >
        <Logomark size={84} />
      </motion.div>
    </div>
  );
}
