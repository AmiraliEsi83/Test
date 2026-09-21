import React, { useState } from "react";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../lib/instruments";
import { PageHeader, Empty, ModeBadge, SimBadge } from "../components/ui";

export default function Positions() {
  const { positions, closePosition, updatePosition, closeAll } = useTrading();
  const [lots, setLots] = useState({});
  if (!positions.length) return <div className="page dash"><PageHeader kicker="Positions" title="Open positions" sub="Nothing open. Fire a paper order from the terminal or a signal." /><Empty title="No open positions" sub="Paper trade first — everything here is SIMULATED unless routed live." /></div>;
  return (
    <div className="page dash">
      <PageHeader kicker="Positions" title={`Open positions (${positions.length})`} sub="Move stops/targets, scale out, or flatten." right={<button className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm("Close ALL positions?")) closeAll(); }}>Close all</button>} />
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="pos-table">
          <thead><tr><th>Asset</th><th>Dir</th><th>Size</th><th>Entry</th><th>Mark</th><th>Stop</th><th>Target</th><th>P/L</th><th>Strategy</th><th>Mode</th><th>Opened</th><th>Actions</th></tr></thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id}>
                <td>{p.symbol}</td>
                <td className={p.side === "buy" ? "up" : "down"}>{p.side.toUpperCase()}</td>
                <td>{p.lots}</td>
                <td>{formatPrice(p.symbol, p.entry)}</td>
                <td>{formatPrice(p.symbol, p.mark)}</td>
                <td>{p.sl != null ? formatPrice(p.symbol, p.sl) : "—"}</td>
                <td>{p.tp != null ? formatPrice(p.symbol, p.tp) : "—"}</td>
                <td className={p.pnl >= 0 ? "up" : "down"}>{p.pnl >= 0 ? "+" : ""}{p.pnl.toFixed(2)}</td>
                <td>{p.algorithm}</td>
                <td><ModeBadge mode={p.mode} /><SimBadge simulated={p.simulated} /></td>
                <td>{new Date(p.openedAt).toLocaleString()}</td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => closePosition(p.id, "Manual close")}>Close</button>
                    <input placeholder="lots" style={{ width: 52 }} value={lots[p.id] || ""} onChange={(e) => setLots({ ...lots, [p.id]: e.target.value })} />
                    <button className="btn btn-ghost btn-sm" onClick={() => closePosition(p.id, "Manual scale-out", Number(lots[p.id]))}>Partial</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { const v = window.prompt("New stop price", p.sl ?? ""); if (v) updatePosition(p.id, { sl: Number(v) }); }}>SL</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { const v = window.prompt("New target price", p.tp ?? ""); if (v) updatePosition(p.id, { tp: Number(v) }); }}>TP</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
