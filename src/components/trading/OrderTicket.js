import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTrading } from "../../context/TradingContext";
import { formatPrice } from "../../lib/instruments";

export default function OrderTicket() {
  const { plan } = useAuth();
  const { symbol, lastPrice, openPosition, placePendingOrder, brokers, activeBrokerId, setActiveBrokerId, settings, session, harsi, pulse, mode } = useTrading();
  const [lots, setLots] = useState(settings.defaultLots);
  const [sl, setSl] = useState(22);
  const [tp, setTp] = useState(34);
  const [type, setType] = useState("market");
  const [limitPx, setLimitPx] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const submit = (side) => {
    setErr(""); setOk("");
    try {
      if (type !== "market") {
        if (!limitPx) throw new Error("Enter a limit/stop price.");
        placePendingOrder({ side, type, lots, price: Number(limitPx), algorithm: "manual" });
        setOk(`${type} ${side.toUpperCase()} working`);
      } else {
        openPosition({ side, lots, slPips: Number(sl), tpPips: Number(tp), algorithm: "manual" });
        setOk(`${side.toUpperCase()} filled [${mode.toUpperCase()}]`);
      }
    } catch (e) { setErr(e.message); }
  };

  return (
    <aside className="ticket">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Order ticket</strong>
        <span className={`badge ${mode === "live" ? "badge-sell" : "badge-teal"}`}>{mode.toUpperCase()} · {session.name}</span>
      </div>
      <div className="field">
        <label>Broker</label>
        <select value={activeBrokerId} onChange={(e) => setActiveBrokerId(e.target.value)}>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>{b.name} · {b.currency} {Math.round(b.balance).toLocaleString()} {b.id === "paper" ? "[PAPER]" : ""}</option>
          ))}
        </select>
      </div>
      <div className="harsi-meter">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="faint">Last</span>
          <b className="mono">{formatPrice(symbol, lastPrice)}</b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span className="faint">Harsi</span>
          <b className={`mono ${harsi?.value < 0 ? "up" : harsi?.value > 0 ? "down" : ""}`}>{harsi ? `${harsi.value.toFixed(1)} pips` : "—"}</b>
        </div>
        <div className="meter-track">
          <div className="meter-needle" style={{ left: `${Math.max(4, Math.min(96, 50 + (harsi?.value || 0)))}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }} className="faint">
          <span>−30 buy</span><span>0 mid</span><span>+30 sell</span>
        </div>
      </div>
      {pulse && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div className="faint" style={{ fontSize: 11 }}>Pulse Confluence</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <b className="mono">{pulse.score}</b>
            <span className={`badge ${pulse.side === "buy" ? "badge-buy" : pulse.side === "sell" ? "badge-sell" : "badge-teal"}`}>{pulse.side ? pulse.side : "neutral"}</span>
          </div>
          <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>EMA {formatPrice(symbol, pulse.ema9)} / {formatPrice(symbol, pulse.ema21)} · RSI {pulse.rsi?.toFixed(1)}</div>
        </div>
      )}
      <div className="field">
        <label>Order type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
        </select>
      </div>
      {type !== "market" && (
        <div className="field">
          <label>{type} price</label>
          <input placeholder={formatPrice(symbol, lastPrice)} value={limitPx} onChange={(e) => setLimitPx(e.target.value)} />
        </div>
      )}
      <div className="lots-row">
        <div className="field">
          <label>Lots</label>
          <input type="number" step="0.01" min="0.01" value={lots} onChange={(e) => setLots(e.target.value)} />
        </div>
        <div className="field">
          <label>Stop (pips)</label>
          <input type="number" value={sl} onChange={(e) => setSl(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Target (pips)</label>
        <input type="number" value={tp} onChange={(e) => setTp(e.target.value)} />
      </div>
      {err && <div className="error">{err}</div>}
      {ok && <div className="badge badge-buy" style={{ marginBottom: 10 }}>{ok}</div>}
      {plan.paperExecute || plan.execute ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="btn btn-buy" onClick={() => submit("buy")}>Buy</button>
          <button className="btn btn-sell" onClick={() => submit("sell")}>Sell</button>
        </div>
      ) : (
        <Link to="/pricing" className="btn btn-primary" style={{ width: "100%" }}>Subscribe to execute</Link>
      )}
      <p className="faint" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>
        Paper fills are SIMULATED. Live routing needs a connected adapter + LIVE mode + passing risk checks.
      </p>
    </aside>
  );
}
