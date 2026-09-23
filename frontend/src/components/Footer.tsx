import Link from "next/link";
import { BookOpen, Code2, ExternalLink, LayoutGrid, ListChecks, ShieldPlus } from "lucide-react";
import { Wordmark } from "./Logo";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 80 }}>
      <div className="container" style={{ padding: "36px 16px", display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "space-between" }}>
        <div style={{ maxWidth: 360 }}>
          <Wordmark />
          <p className="muted" style={{ fontSize: "0.85rem", margin: "12px 0 0" }}>
            Privacy claims tested against the app&apos;s own store listing. GenLayer reads the listing; deterministic code moves the money.
          </p>
        </div>
        <div style={{ display: "grid", gap: 8, fontSize: "0.86rem" }} className="mono">
          <Link href="/challenge" style={{ display: "flex", gap: 8, alignItems: "center" }}><ShieldPlus size={14} /> Challenge an app</Link>
          <Link href="/challenges" style={{ display: "flex", gap: 8, alignItems: "center" }}><ListChecks size={14} /> Browse results</Link>
          <Link href="/apps" style={{ display: "flex", gap: 8, alignItems: "center" }}><LayoutGrid size={14} /> Audited apps</Link>
        </div>
        <div style={{ display: "grid", gap: 8, fontSize: "0.86rem" }} className="mono">
          <Link href="/docs" style={{ display: "flex", gap: 8, alignItems: "center" }}><BookOpen size={14} /> Docs</Link>
          <a href="https://github.com/kenil1710/appaudit" target="_blank" rel="noreferrer" style={{ display: "flex", gap: 8, alignItems: "center" }}><Code2 size={14} /> Source <ExternalLink size={12} /></a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer" style={{ display: "flex", gap: 8, alignItems: "center" }}><ExternalLink size={14} /> GenLayer</a>
        </div>
      </div>
    </footer>
  );
}
