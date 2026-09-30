"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, BookOpen, Coins, FilePlus2, History, LayoutGrid, ListChecks, LogOut, Menu, Radio, ShieldPlus, Wallet, X } from "lucide-react";
import { Wordmark } from "./Logo";
import { useWallet } from "./WalletProvider";
import { NETWORK_LABEL } from "@/lib/genlayer";
import { short } from "@/lib/format";

export const NAV = [
  { href: "/v2/file", label: "File", icon: FilePlus2 },
  { href: "/v2", label: "Cases", icon: ListChecks },
  { href: "/v2/apps", label: "Apps", icon: LayoutGrid },
  { href: "/v2/timeline", label: "Timeline", icon: History },
  { href: "/v2/developer", label: "Developer", icon: BadgeCheck },
  { href: "/v2/balance", label: "Balance", icon: Coins },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/challenges", label: "Earlier results (v1)", icon: ShieldPlus },
];

function isActive(href: string, path: string): boolean {
  if (href === "/v2") return path === "/v2" || path.startsWith("/v2/case");
  if (href === "/v2/apps") return path.startsWith("/v2/apps") || path.startsWith("/v2/app");
  if (href === "/challenges") return ["/challenge", "/challenges", "/apps"].some((p) => path === p || path.startsWith("/challenge/"));
  return path === href || path.startsWith(href + "/");
}

export function NetworkBadge() {
  const { account, onRightNetwork, switchNetwork } = useWallet();
  const wrong = Boolean(account) && !onRightNetwork;
  if (wrong) {
    return (
      <button className="btn btn-sm btn-ghost" onClick={() => void switchNetwork()} style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
        <Radio size={14} /> Switch to {NETWORK_LABEL}
      </button>
    );
  }
  return (
    <span className="chip" title="GenLayer Studio Devnet, chain 61997" style={{ color: "var(--green)" }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} />
      {NETWORK_LABEL}
    </span>
  );
}

export function WalletButton() {
  const { account, connect, connecting, disconnect, hasWallet, error } = useWallet();
  if (account) {
    return (
      <button className="btn btn-sm btn-ghost" onClick={disconnect} title="Disconnect from this app">
        <Wallet size={14} color="var(--cyan)" /> {short(account)} <LogOut size={13} />
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
      <button className="btn btn-sm btn-primary" onClick={() => void connect()} disabled={connecting}>
        <Wallet size={14} /> {connecting ? "Connecting…" : hasWallet ? "Connect wallet" : "Connect"}
      </button>
      {error && <span style={{ color: "var(--hot)", fontSize: "0.7rem", marginTop: 4, maxWidth: 220, textAlign: "right" }}>{error}</span>}
    </span>
  );
}

export function AppHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(14px)", background: "rgba(13,13,26,.72)", borderBottom: "1px solid var(--line)" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", gap: 14, height: 64 }}>
        <Link href="/" aria-label="AppAudit home">
          <Wordmark />
        </Link>
        <nav className="hide-md" style={{ display: "flex", gap: 2, marginLeft: 14 }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, path);
            return (
              <Link
                key={href}
                href={href}
                className="mono"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 9px", borderRadius: 10, fontSize: "0.78rem",
                  color: active ? "var(--cyan)" : "var(--text-2)", background: active ? "var(--cyan-dim)" : "transparent",
                }}
              >
                <Icon size={15} /> {label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="hide-sm"><NetworkBadge /></span>
          <WalletButton />
          <button className="btn btn-sm btn-ghost show-md" aria-label="Menu" onClick={() => setOpen(!open)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="show-md container" style={{ display: "grid", gap: 4, paddingBottom: 14 }}>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="mono" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 8px", color: "var(--text-2)" }}>
              <Icon size={16} /> {label}
            </Link>
          ))}
          <div style={{ padding: "6px 8px" }}><NetworkBadge /></div>
        </nav>
      )}
    </header>
  );
}
