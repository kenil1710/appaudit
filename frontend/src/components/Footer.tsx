import Link from "next/link";
import { BookOpen, Code2, ExternalLink, LayoutGrid, ListChecks, ShieldPlus } from "lucide-react";
import { Wordmark } from "./Logo";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 80 }}>
      <div className="container" style={{ padding: "36px 16px", display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "space-between" }}>
        <div style={{ maxWidth: 360 }}>
          <Wordmark badge={false} />
          <p className="muted" style={{ fontSize: "0.85rem", margin: "12px 0 0" }}>
            An app&apos;s privacy declarations, tested against each other: both store listings and its linked policy. Validators fetch the evidence; code decides and moves the money.
          </p>
        </div>
        <div style={{ display: "grid", gap: 8, fontSize: "0.86rem" }} className="mono">
          <Link href="/v2/file" style={{ display: "flex", gap: 8, alignItems: "center" }}><ShieldPlus size={14} /> File a case</Link>
          <Link href="/v2" style={{ display: "flex", gap: 8, alignItems: "center" }}><ListChecks size={14} /> Cases</Link>
          <Link href="/v2/apps" style={{ display: "flex", gap: 8, alignItems: "center" }}><LayoutGrid size={14} /> Apps</Link>
          <Link href="/challenges" style={{ display: "flex", gap: 8, alignItems: "center" }}><ListChecks size={14} /> Earlier results (v1)</Link>
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
