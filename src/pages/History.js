import React, { useState } from "react";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../lib/instruments";
import { PageHeader, Empty, ModeBadge } from "../components/ui";

export default function History() {
  const { closed } = useTrading();
  const [q, setQ] = useState("");
  const [side, setSide] = useState("all");
  const list = closed.filter((t) =>
    (side === "all" || t.side === side) &&
    (!q || `${t.symbol} ${t.algorithm} ${t.brokerName}`.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="page dash">
      <PageHeader kicker="Ledger" title={`Trade history (${list.length})`} sub="Every paper + live fill. Searchable and filterable." right={<><input placeholder="Search symbol, strategy, broker…" value={q} onChange={(e) => setQ(e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--line-strong)", color: "var(--text)", borderRadius: 10, padding: "8px 10px", minWidth: 220 }} /><div className="tabs"><button className={side === "all" ? "active" : ""} onClick={() => setSide("all")}>All</button><button className={side === "buy" ? "active" : ""} onClick={() => setSide("buy")}>Long</button><button className={side === "sell" ? "active" : ""} onClick={() => setSide("sell")}>Short</button></div></>} />
      {!list.length && <Empty title="No trades yet" sub="Close a paper position and it will appear here." />}
      {!!list.length && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="pos-table">
            <thead><tr><th>Symbol</th><th>Side</th><th>Lots</th><th>Entry</th><th>Exit</th><th>P/L</th><th>Strategy</th><th>Broker</th><th>Mode</th><th>Duration</th><th>Reason</th><th>Closed</th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>{t.symbol}</td>
                  <td className={t.side === "buy" ? "up" : "down"}>{t.side.toUpperCase()}</td>
                  <td>{t.lots}</td>
                  <td>{formatPrice(t.symbol, t.entry)}</td>
                  <td>{formatPrice(t.symbol, t.exit)}</td>
                  <td className={t.pnl >= 0 ? "up" : "down"}>{t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}</td>
                  <td>{t.algorithm}</td>
                  <td>{t.brokerName}</td>
                  <td><ModeBadge mode={t.mode || "paper"} /></td>
                  <td>{t.durationMin != null ? `${t.durationMin}m` : "—"}</td>
                  <td>{t.reason}</td>
                  <td>{new Date(t.closedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
