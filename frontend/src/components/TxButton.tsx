"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { waitForResult, type TransactionHash } from "@/lib/contract";
import type { WriteResult } from "@/lib/types";

type Phase = "idle" | "signing" | "waiting" | "done" | "rejected" | "error";

/**
 * One button per write. It connects the wallet if needed, puts it on the right
 * network, sends, waits for acceptance, and shows what the CONTRACT said -
 * which on AppAudit is a status, never a revert.
 */
export function TxButton({ label, icon, run, onDone, className = "btn btn-primary", disabled, waitingLabel = "Waiting for consensus…" }: {
  label: string;
  icon?: ReactNode;
  run: (account: `0x${string}`) => Promise<TransactionHash>;
  onDone?: (r: WriteResult) => void;
  className?: string;
  disabled?: boolean;
  waitingLabel?: string;
}) {
  const { account, connect, onRightNetwork, switchNetwork } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");
  const [hash, setHash] = useState<string>("");
  const hashRef = useRef<string>("");

  async function go() {
    setMessage("");
    hashRef.current = "";
    try {
      if (!account) {
        await connect();
        return;
      }
      if (!onRightNetwork) await switchNetwork();
      setPhase("signing");
      const h = await run(account);
      hashRef.current = h;
      setHash(h);
      setPhase("waiting");
      const result = await waitForResult(h);
      if (result.status === "REJECTED") {
        setPhase("rejected");
        setMessage(String(result.reason ?? "The contract refused this call."));
      } else {
        setPhase("done");
        setMessage(typeof result.note === "string" ? result.note : "Done.");
      }
      onDone?.(result);
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      if (hashRef.current && /timed? ?out|retries|exceeded|not found/i.test(text)) {
        // Studio Dev has been measured holding a consensus transaction PENDING
        // for over twenty minutes and then settling it correctly. Waiting that
        // long is not a failure; this page re-reads the chain on its own.
        setPhase("done");
        setMessage("Still pending on Studio Dev. It will settle on its own; this page refreshes from the chain.");
        onDone?.({ status: "OK" });
        return;
      }
      setPhase("error");
      setMessage(/user rejected|denied/i.test(text) ? "Cancelled in the wallet." : text.slice(0, 220));
    }
  }

  const busy = phase === "signing" || phase === "waiting";
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button className={className} onClick={() => void go()} disabled={disabled || busy}>
        {busy ? <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} /> : icon}
        {!account ? "Connect wallet" : phase === "signing" ? "Confirm in wallet…" : phase === "waiting" ? waitingLabel : label}
      </button>
      {message && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.82rem", color: phase === "done" ? "var(--green)" : "var(--hot)" }}>
          {phase === "done" ? <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
          <span style={{ wordBreak: "break-word" }}>{message}</span>
        </div>
      )}
      {hash && <span className="hash">tx {hash.slice(0, 18)}…</span>}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
