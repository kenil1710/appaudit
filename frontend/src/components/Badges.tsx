import { Apple, CheckCircle2, CircleDashed, Clock, HelpCircle, ShieldAlert, Smartphone } from "lucide-react";
import { PLATFORM_LABEL, STATUS_LABEL, VERDICT_LABEL, verdictColor } from "@/lib/format";
import type { Platform } from "@/lib/types";

export function PlatformBadge({ platform }: { platform: Platform | "" }) {
  const Icon = platform === "app_store" ? Apple : Smartphone;
  return (
    <span className="chip" style={{ color: platform === "app_store" ? "var(--text)" : "var(--green)" }}>
      <Icon size={13} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}

export function VerdictBadge({ outcome, big = false }: { outcome: string; big?: boolean }) {
  const color = verdictColor(outcome);
  const Icon =
    outcome === "CONTRADICTED" ? ShieldAlert : outcome === "CLAIM_VERIFIED" ? CheckCircle2 : outcome ? HelpCircle : Clock;
  return (
    <span
      className="chip"
      style={{
        color,
        borderColor: color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        ...(big ? { fontSize: "0.95rem", padding: "8px 16px" } : {}),
      }}
    >
      <Icon size={big ? 18 : 13} />
      {outcome ? VERDICT_LABEL[outcome] ?? outcome : "Pending"}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const live = status === "FILED" || status === "RESPONDED" || status === "SETTLED";
  return (
    <span className="chip" style={{ color: live ? "var(--amber)" : "var(--text-2)" }}>
      {live ? <Clock size={13} /> : <CircleDashed size={13} />}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
