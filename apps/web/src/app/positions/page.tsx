"use client";
import { Shell } from "@/components/Shell";
import { api, money } from "@/lib/api";
import { useEffect, useState } from "react";

export default function PositionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const load = () => api<any>("/api/positions").then((d) => setRows(d.positions));
  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <Shell>
      <h2>Positions</h2>
      {msg && <p>{msg}</p>}
      <table>
        <thead>
          <tr>
            <th>Asset</th><th>Dir</th><th>Size</th><th>Entry</th><th>Mark</th><th>Stop</th><th>Target</th><th>P/L</th><th>Strategy</th><th>Opened</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.symbol} <span className="badge badge-gold">{p.modeLabel}</span></td>
              <td className={p.side === "buy" ? "up" : "down"}>{p.side}</td>
              <td>{p.lots}</td>
              <td>{p.entry}</td>
              <td>{p.mark}</td>
              <td>{p.stop ?? "—"}</td>
              <td>{p.target ?? "—"}</td>
              <td className={p.pnl >= 0 ? "up" : "down"}>{money(p.pnl)}</td>
              <td>{p.strategyId || "manual"}</td>
              <td>{new Date(p.openedAt).toLocaleString()}</td>
              <td>
                <button className="btn btn-sm" onClick={async () => { await api(`/api/positions/${p.id}/close`, { method: "POST", body: "{}" }); load(); }}>Close</button>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={11} className="empty">No open positions</td></tr>}
        </tbody>
      </table>
    </Shell>
  );
}
