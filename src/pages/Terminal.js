import React, { useState } from "react";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../lib/instruments";
import ProChart from "../components/chart/ProChart";
import OrderTicket from "../components/trading/OrderTicket";
import PositionsTable from "../components/trading/PositionsTable";
import { Watchlist } from "../components/Widgets";
import TvChart from "../components/chart/TvChart";

export default function Terminal() {
  const { symbol, lastPrice, candles, session, harsi, pulse, signals, positions, timeframe, setTimeframe, timeframes, settings, setSettings, marketSourceLabel } = useTrading();
  const [feed, setFeed] = useState("harsi");
  const symSignals = signals.filter((s) => s.symbol === symbol).slice(0, 30);

  return (
    <div className="terminal">
      <aside className="side-panel">
        <div className="faint" style={{ marginBottom: 8 }}>Markets · <span className="badge badge-gold">SIMULATED</span></div>
        <Watchlist compact />
        <div className="harsi-meter">
          <div className="faint">Session</div>
          <strong>{session.name}</strong>
          <p className="muted" style={{ fontSize: 12 }}>{session.note}</p>
          <div className="faint" style={{ marginTop: 8 }}>Asian range {harsi?.rangePips ? `${harsi.rangePips.toFixed(1)} pips` : "—"}</div>
          <div className="mono" style={{ marginTop: 4 }}>HARSI <b>{harsi ? harsi.value.toFixed(1) : "—"}</b> · Pulse <b>{pulse?.score ?? "—"}</b></div>
        </div>
      </aside>
      <section className="chart-wrap">
        <div className="chart-toolbar">
          <div>
            <strong>{symbol}</strong> <span className="mono">{formatPrice(symbol, lastPrice)}</span>
            {harsi && <span className={`badge ${harsi.zone === "buy" ? "badge-buy" : harsi.zone === "sell" ? "badge-sell" : "badge-gold"}`} style={{ marginLeft: 8 }}>Harsi {harsi.value.toFixed(1)}</span>}
            <span className="badge badge-teal" style={{ marginLeft: 6 }}>{marketSourceLabel}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <div className="tabs">
              {timeframes.map((t) => (
                <button key={t} className={timeframe === t ? "active" : ""} onClick={() => setTimeframe(t)}>{t}</button>
              ))}
            </div>
            <div className="tabs">
              <button className={feed === "harsi" ? "active" : ""} onClick={() => setFeed("harsi")}>HARSI pro</button>
              <button className={feed === "tv" ? "active" : ""} onClick={() => setFeed("tv")}>TradingView</button>
            </div>
          </div>
        </div>
        {feed === "harsi" ? (
          <ProChart candles={candles} signals={symSignals} positions={positions.filter((p) => p.symbol === symbol)} harsi={harsi} symbol={symbol} show={settings.chart} />
        ) : (
          <TvChart symbol={symbol} />
        )}
        <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
          {["showEma", "showRsi", "showSessions", "showSr"].map((k) => (
            <label key={k} className="faint" style={{ fontSize: 12 }}>
              <input type="checkbox" checked={settings.chart?.[k] !== false} onChange={(e) => setSettings({ ...settings, chart: { ...settings.chart, [k]: e.target.checked } })} /> {k.replace("show", "")}
            </label>
          ))}
          <span className="faint" style={{ fontSize: 11, marginLeft: "auto" }}>Click a signal in Signal Center for full explanation.</span>
        </div>
      </section>
      <OrderTicket />
      <PositionsTable />
    </div>
  );
}
