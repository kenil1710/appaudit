"use client";

import { Coins, Landmark, Scale } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TxButton } from "@/components/TxButton";
import { useWallet } from "@/components/WalletProvider";
import { useBalance2, useStats2 } from "@/lib/hooks2";
import { gen } from "@/lib/format";
import { tx2, V2_ADDRESS } from "@/lib/v2";

export default function BalancePage() {
  const { account, connect } = useWallet();
  const { data: bal, mutate } = useBalance2(account);
  const { data: s, mutate: ms } = useStats2();
  const refresh = () => { void mutate(); void ms(); };
  const claim = BigInt(bal?.claimable_wei ?? "0");
  const fees = BigInt(bal?.fees_wei ?? "0");
  return (
    <AppShell title="Balance"
      blurb="AppAudit never pushes a payout. Every settlement, refund and returned stake is credited to a claimable balance; withdraw() zeroes it and then sends it.">
      <div className="split">
        <div className="glass panel" style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}><Coins size={14} /> Your claimable balance</div>
          {!account ? <button className="btn btn-primary" onClick={() => void connect()}>Connect wallet</button> : (<>
            <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--cyan)" }}>{gen(claim.toString(), 4)} GEN</div>
            <TxButton label="Withdraw everything" icon={<Coins size={16} />} disabled={claim <= 0n} run={(a) => tx2.withdraw(a)} onDone={refresh} />
            {fees > 0n && (<>
              <div className="label">protocol fees credited to this wallet</div>
              <div className="mono" style={{ fontSize: "1.2rem" }}>{gen(fees.toString(), 4)} GEN</div>
              <TxButton className="btn btn-lav" label="Withdraw protocol fees" icon={<Landmark size={16} />} run={(a) => tx2.withdrawFees(a)} onDone={refresh} />
            </>)}
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>A second withdraw finds a zero balance and is refused: nothing is paid twice.</p>
          </>)}
        </div>
        <div className="glass panel" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="eyebrow" style={{ display: "flex", gap: 8, alignItems: "center" }}><Scale size={14} /> The contract&apos;s books</div>
          {s && (<>
            <div className="mono" style={{ fontSize: "0.85rem", display: "grid", gap: 6 }}>
              <span>balance  {gen(s.balance_wei, 4)} GEN</span>
              <span>= open stakes  {gen(s.locked_wei, 4)}</span>
              <span>+ claimable  {gen(s.claimable_wei, 4)}</span>
              <span>+ protocol fees  {gen(s.protocol_wei, 4)}</span>
            </div>
            <span className="chip chip-wrap" style={{ justifySelf: "start", color: s.ledger_balanced ? "var(--green)" : "var(--hot)" }}>{s.ledger_balanced ? "identity holds" : "identity broken"} · {s.identity}</span>
            <span className="mono muted" style={{ fontSize: "0.76rem" }}>withdrawn so far {gen(s.total_withdrawn_wei, 4)} GEN · chain balance {s.chain_balance_wei === "unknown" ? "unknown" : `${gen(s.chain_balance_wei, 4)} GEN`} · undelivered by Studio {gen(s.undelivered_wei, 4)} GEN</span>
            <p style={{ margin: 0, fontSize: "0.88rem" }}>
              Studio Dev records every withdrawal in the contract&apos;s books but does not actually deliver value transfers, so the contract&apos;s chain balance still shows the {gen(s.undelivered_wei, 2)} GEN that was withdrawn but never sent.
            </p>
            <span className="hash">{V2_ADDRESS}</span>
          </>)}
        </div>
      </div>
    </AppShell>
  );
}
