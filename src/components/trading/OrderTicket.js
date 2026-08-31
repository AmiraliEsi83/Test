import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTrading } from "../../context/TradingContext";
import { formatPrice } from "../../lib/instruments";
import { Link } from "react-router-dom";

export default function OrderTicket() {
  const { plan } = useAuth();
  const {
    symbol,
    lastPrice,
    openPosition,
    brokers,
    activeBrokerId,
    setActiveBrokerId,
    settings,
    session,
    harsi,
    pulse,
  } = useTrading();
  const [lots, setLots] = useState(settings.defaultLots);
  const [sl, setSl] = useState(22);
  const [tp, setTp] = useState(34);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const submit = (side) => {
    setErr("");
    setOk("");
    try {
      openPosition({
        side,
        lots,
        slPips: Number(sl),
        tpPips: Number(tp),
        algorithm: "manual",
      });
      setOk(`${side.toUpperCase()} sent to broker`);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <aside className="ticket">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Order ticket</strong>
        <span className="badge badge-teal">{session.name}</span>
      </div>
      <div className="field">
        <label>Broker</label>
        <select
          value={activeBrokerId}
          onChange={(e) => setActiveBrokerId(e.target.value)}
        >
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} · {b.currency} {Math.round(b.balance).toLocaleString()}
            </option>
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
          <b className={`mono ${harsi?.value < 0 ? "up" : harsi?.value > 0 ? "down" : ""}`}>
            {harsi ? `${harsi.value.toFixed(1)} pips` : "—"}
          </b>
        </div>
        <div className="meter-track">
          <div
            className="meter-needle"
            style={{
              left: `${Math.max(4, Math.min(96, 50 + (harsi?.value || 0)))}%`,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }} className="faint">
          <span>−30 buy</span>
          <span>0 mid</span>
          <span>+30 sell</span>
        </div>
      </div>
      {pulse && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div className="faint" style={{ fontSize: 11 }}>
            Pulse Confluence
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <b className="mono">{pulse.score}</b>
            <span className={`badge ${pulse.side === "buy" ? "badge-buy" : pulse.side === "sell" ? "badge-sell" : "badge-teal"}`}>
              {pulse.side ? pulse.side : "neutral"}
            </span>
          </div>
        </div>
      )}
      <div className="lots-row">
        <div className="field">
          <label>Lots</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
          />
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
      {plan.execute ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="btn btn-buy" onClick={() => submit("buy")}>
            Buy
          </button>
          <button className="btn btn-sell" onClick={() => submit("sell")}>
            Sell
          </button>
        </div>
      ) : (
        <Link to="/pricing" className="btn btn-primary" style={{ width: "100%" }}>
          Subscribe to execute
        </Link>
      )}
      <p className="faint" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>
        Connected brokers receive marketable orders at the last print. Paper desk fills instantly. Live APIs keep keys in this browser only.
      </p>
    </aside>
  );
}
