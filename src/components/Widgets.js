import React, { useEffect, useState } from "react";
import { useTrading } from "../context/TradingContext";
import { INSTRUMENT_LIST, formatPrice } from "../lib/instruments";
import { sessionOpenStates } from "../lib/econ";
import { countdownToLondon } from "../lib/sessions";

export function Watchlist({ compact }) {
  const { watchlist, setWatchlist, symbol, setSymbol, prices, lastPrice } = useTrading();
  const [add, setAdd] = useState("");
  const toggle = (id) => {
    setWatchlist(watchlist.includes(id) ? watchlist.filter((w) => w !== id) : [...watchlist, id]);
  };
  return (
    <div>
      {watchlist.map((id) => {
        const inst = INSTRUMENT_LIST.find((x) => x.id === id);
        if (!inst) return null;
        const px = id === symbol ? lastPrice : prices?.[id];
        return (
          <button key={id} className={`pair-btn ${symbol === id ? "active" : ""}`} onClick={() => setSymbol(id)}>
            <span>{inst.label}</span>
            <span className="mono faint">{px != null ? formatPrice(id, px) : "—"}</span>
          </button>
        );
      })}
      {!compact && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <select value={add} onChange={(e) => setAdd(e.target.value)} style={{ flex: 1, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--line-strong)", borderRadius: 9, padding: 7 }}>
            <option value="">Add instrument…</option>
            {INSTRUMENT_LIST.filter((x) => !watchlist.includes(x.id)).map((x) => (
              <option key={x.id} value={x.id}>{x.label}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (add) { setWatchlist([...watchlist, add]); setAdd(""); } }}>Add</button>
        </div>
      )}
      {!compact && (
        <div style={{ marginTop: 8 }}>
          {watchlist.map((id) => (
            <button key={id} className="btn btn-ghost btn-sm" style={{ margin: "2px 4px 2px 0" }} onClick={() => toggle(id)}>✕ {id}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionWidget() {
  const [states, setStates] = useState(sessionOpenStates());
  const [clock, setClock] = useState(countdownToLondon());
  useEffect(() => {
    const t = setInterval(() => { setStates(sessionOpenStates()); setClock(countdownToLondon()); }, 1000);
    return () => clearInterval(t);
  }, []);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16 }}>Sessions</h3>
        <span className="faint mono" style={{ fontSize: 11 }}>{tz}</span>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {states.map((s) => (
          <div key={s.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span><span className="dot" style={{ background: s.open ? "var(--buy)" : "#3a4356", boxShadow: "none", marginRight: 8 }} />{s.label}</span>
            <span className={s.open ? "up" : "faint"}>{s.open ? "OPEN" : "CLOSED"}</span>
          </div>
        ))}
      </div>
      <div className="mono" style={{ marginTop: 10, fontSize: 13 }}>
        London in <b>{clock.label}</b>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>Critical for HARSI T-15 window (07:45 London).</p>
    </div>
  );
}
