import React, { useState } from "react";
import { useTrading } from "../context/TradingContext";
import { INSTRUMENT_LIST, formatPrice } from "../lib/instruments";
import LiveChart from "../components/chart/LiveChart";
import TvChart from "../components/chart/TvChart";
import OrderTicket from "../components/trading/OrderTicket";
import PositionsTable from "../components/trading/PositionsTable";
import { AlertList } from "../components/alerts/AlertList";

export default function Terminal() {
  const { symbol, setSymbol, lastPrice, session, harsi, prices } = useTrading();
  const [feed, setFeed] = useState("harsi");

  return (
    <div className="terminal">
      <aside className="side-panel">
        <div className="faint" style={{ marginBottom: 8 }}>
          Markets
        </div>
        {INSTRUMENT_LIST.map((p) => (
          <button
            key={p.id}
            className={`pair-btn ${symbol === p.id ? "active" : ""}`}
            onClick={() => setSymbol(p.id)}
          >
            <span>{p.label}</span>
            <span className="mono faint">
              {formatPrice(p.id, p.id === symbol ? lastPrice : prices?.[p.id])}
            </span>
          </button>
        ))}
        <div className="harsi-meter">
          <div className="faint">Session</div>
          <strong>{session.name}</strong>
          <p className="muted" style={{ fontSize: 12 }}>
            {session.note}
          </p>
          <div className="faint" style={{ marginTop: 8 }}>
            Asian range {harsi?.rangePips ? `${harsi.rangePips.toFixed(1)} pips` : "—"}
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="faint" style={{ marginBottom: 8 }}>
            Alerts
          </div>
          <AlertList compact />
        </div>
      </aside>

      <section className="chart-wrap">
        <div className="chart-toolbar">
          <div>
            <strong>{symbol}</strong>{" "}
            <span className="mono">{formatPrice(symbol, lastPrice)}</span>
            {harsi && (
              <span className={`badge ${harsi.zone === "buy" ? "badge-buy" : harsi.zone === "sell" ? "badge-sell" : "badge-gold"}`} style={{ marginLeft: 8 }}>
                Harsi {harsi.value.toFixed(1)}
              </span>
            )}
          </div>
          <div className="tabs">
            <button className={feed === "harsi" ? "active" : ""} onClick={() => setFeed("harsi")}>
              HARSI live
            </button>
            <button className={feed === "tv" ? "active" : ""} onClick={() => setFeed("tv")}>
              TradingView
            </button>
          </div>
        </div>
        {feed === "harsi" ? <LiveChart /> : <TvChart symbol={symbol} />}
      </section>

      <OrderTicket />
      <PositionsTable />
    </div>
  );
}
