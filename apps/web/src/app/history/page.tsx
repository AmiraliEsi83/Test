"use client";
import { Shell } from "@/components/Shell";
import { api, money } from "@/lib/api";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [q, setQ] = useState({ symbol: "", mode: "paper", strategy: "" });
  const load = () => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(q).filter(([, v]) => v))).toString();
    api<any>(`/api/history?${params}`).then((d) => setTrades(d.trades));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [q.symbol, q.mode, q.strategy]);
  return (
    <Shell>
      <h2>Trade history</h2>
      <div className="tabs">
        <input placeholder="Symbol" value={q.symbol} onChange={(e) => setQ({ ...q, symbol: e.target.value.toUpperCase() })} />
        <select value={q.mode} onChange={(e) => setQ({ ...q, mode: e.target.value })}>
          <option value="">paper+live</option>
          <option value="paper">PAPER</option>
          <option value="live">LIVE</option>
        </select>
        <input placeholder="Strategy" value={q.strategy} onChange={(e) => setQ({ ...q, strategy: e.target.value })} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Closed</th><th>Asset</th><th>Side</th><th>Entry</th><th>Exit</th><th>P/L</th><th>Strategy</th><th>Duration</th><th>Broker</th><th>Mode</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id}>
              <td>{new Date(t.closedAt).toLocaleString()}</td>
              <td>{t.symbol}</td>
              <td>{t.side}</td>
              <td>{t.entry}</td>
              <td>{t.exit}</td>
              <td className={t.pnl >= 0 ? "up" : "down"}>{money(t.pnl)}</td>
              <td>{t.strategyId || "manual"}</td>
              <td>{Math.round(t.durationMs / 60000)}m</td>
              <td>{t.brokerId}</td>
              <td><span className="badge badge-gold">{t.mode.toUpperCase()}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
