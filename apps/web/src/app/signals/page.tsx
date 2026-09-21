"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SignalsPage() {
  const [data, setData] = useState<any>(null);
  const [f, setF] = useState({ strategy: "", symbol: "", side: "", status: "" });
  const load = () => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v))).toString();
    api<any>(`/api/signals${q ? `?${q}` : ""}`).then(setData);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.strategy, f.symbol, f.side, f.status]);
  return (
    <Shell>
      <h2>Signal Center</h2>
      {data?.delayed && <p className="badge badge-gold">DELAYED · Free plan</p>}
      <div className="tabs">
        <select value={f.strategy} onChange={(e) => setF({ ...f, strategy: e.target.value })}>
          <option value="">All strategies</option>
          <option value="london-harsi">London HARSI</option>
          <option value="pulse-confluence">Pulse</option>
          <option value="breakout-trend">Breakout</option>
        </select>
        <input placeholder="Asset" value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value.toUpperCase() })} />
        <select value={f.side} onChange={(e) => setF({ ...f, side: e.target.value })}>
          <option value="">Buy/Sell</option>
          <option value="buy">BUY</option>
          <option value="sell">SELL</option>
        </select>
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">All status</option>
          <option value="active">active</option>
          <option value="closed">closed</option>
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Asset</th>
            <th>TF</th>
            <th>Algo</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Stop</th>
            <th>Target</th>
            <th>Mark</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.signals?.map((s: any) => (
            <tr key={s.id}>
              <td>
                <Link href={`/signals/${s.id}`}>{new Date(s.createdAt).toLocaleString()}</Link>
              </td>
              <td>{s.symbol}</td>
              <td>{s.timeframe}</td>
              <td>{s.strategyId}</td>
              <td className={s.side === "buy" ? "up" : "down"}>{s.side}</td>
              <td>{s.entry}</td>
              <td>{s.stop}</td>
              <td>{s.target}</td>
              <td>{s.currentPrice}</td>
              <td>{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
