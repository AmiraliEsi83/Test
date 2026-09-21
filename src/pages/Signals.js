import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../lib/instruments";
import { PageHeader, ChecksList, Empty, SimBadge } from "../components/ui";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Signals() {
  const { signals, executeFromAlert } = useTrading();
  const q = useQuery();
  const [strategy, setStrategy] = useState(q.get("strategy") || "all");
  const [side, setSide] = useState("all");
  const [status, setStatus] = useState("all");
  const [asset, setAsset] = useState("all");
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");

  const list = signals.filter((s) =>
    (strategy === "all" || s.algorithm === strategy) &&
    (side === "all" || s.side === side) &&
    (status === "all" || s.status === status) &&
    (asset === "all" || s.symbol === asset)
  );

  const assets = [...new Set(signals.map((s) => s.symbol))];

  const trade = (s) => {
    try {
      executeFromAlert({ side: s.side, symbol: s.symbol, slPips: s.slPips, tpPips: s.tpPips, algorithm: s.algorithm, title: `Signal ${s.id}`, signalId: s.id });
      setMsg(`Paper order opened from signal ${s.id.slice(-6)}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="page dash">
      <PageHeader kicker="Signal Center" title="Signals" sub="Entry alerts, exit alerts, and exactly why each one fired." />
      {msg && <div className="card" style={{ borderColor: "var(--teal)" }}>{msg}</div>}
      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <option value="all">All strategies</option>
          <option value="london-harsi">London HARSI</option>
          <option value="pulse-confluence">Pulse Confluence</option>
          <option value="breakout-trend">Breakout + Trend</option>
        </select>
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="all">Buy + Sell</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Open + Closed</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select value={asset} onChange={(e) => setAsset(e.target.value)}>
          <option value="all">All assets</option>
          {assets.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {!list.length && <Empty title="No signals match" sub="Adjust filters or wait for the next T-15 window." />}
      <div style={{ display: "grid", gap: 10 }}>
        {list.map((s) => {
          const rr = s.slPips && s.tpPips ? (s.tpPips / s.slPips).toFixed(2) : "—";
          return (
            <div key={s.id} className={`card alert-item ${s.side}`} style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <b>{s.side.toUpperCase()} {s.symbol}</b> <span className="faint mono">{s.timeframe} · {s.algorithm}</span>
                  <SimBadge simulated={s.simulated} />
                  <span className={`badge ${s.status === "open" ? "badge-buy" : "badge-gold"}`} style={{ marginLeft: 6 }}>{s.status.toUpperCase()}</span>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(s.ts).toLocaleString()} · Entry {formatPrice(s.symbol, s.entry)} · SL {formatPrice(s.symbol, s.stop)} · TP {formatPrice(s.symbol, s.target)} · R:R {rr}</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{s.reason}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetail(s)}>Why?</button>
                  <button className="btn btn-primary btn-sm" onClick={() => trade(s)}>Paper trade</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {detail && (
        <div className="modal-back" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)" }}>
            <h3>{detail.side.toUpperCase()} {detail.symbol} · {detail.algorithm}</h3>
            <p className="muted">{new Date(detail.ts).toLocaleString()} · {detail.timeframe}</p>
            <div className="mono" style={{ fontSize: 13 }}>
              Entry {formatPrice(detail.symbol, detail.entry)} · Stop {formatPrice(detail.symbol, detail.stop)} ({detail.slPips}p) · Target {formatPrice(detail.symbol, detail.target)} ({detail.tpPips}p)
            </div>
            <p>{detail.reason}</p>
            <ChecksList checks={detail.checks} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-primary btn-sm" onClick={() => { trade(detail); setDetail(null); }}>Paper trade this signal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
