import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function ErrorState({ title = "Could not reach the chain", detail, action }: { title?: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="glass panel" style={{ borderColor: "rgba(255,51,102,.45)", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <AlertTriangle size={20} color="var(--hot)" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div className="mono" style={{ fontWeight: 700 }}>{title}</div>
        {detail && <p className="dim" style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>{detail}</p>}
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="glass panel" style={{ textAlign: "center", padding: "40px 20px" }}>
      <Inbox size={26} color="var(--lavender)" />
      <div className="mono" style={{ fontWeight: 700, marginTop: 10 }}>{title}</div>
      {detail && <p className="dim" style={{ margin: "6px auto 0", maxWidth: 460, fontSize: "0.9rem" }}>{detail}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
