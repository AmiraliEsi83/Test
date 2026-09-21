import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { formatPrice } from "../lib/instruments";
import { summarizeTrades } from "../lib/analytics";
import { PageHeader, Stat, EquityCurve, ModeBadge } from "../components/ui";
import { Watchlist, SessionWidget } from "../components/Widgets";

export default function Dashboard() {
  const { user, plan } = useAuth();
  const { lastPrice, symbol, harsi, pulse, positions, brokers, activeBrokerId, mode, setMode, closed, signals, status } = useTrading();
  const active = brokers.find((b) => b.id === activeBrokerId);
  const openPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);
  const base = active?.balance || 100000;
  const equity = base + openPnl;
  const stats = summarizeTrades(closed);

  return (
    <div className="page dash">
      <PageHeader
        kicker={`Good session, ${user.name.split(" ")[0]} · ${plan.name}`}
        title="Desk overview"
        sub={`Connection: ${status.marketData.toUpperCase()} · Engine: ${status.engine.toUpperCase()} · Broker: ${(active?.name || "—").toUpperCase()}`}
        right={<>
          <ModeBadge mode={mode} />
          <div className="tabs">
            <button className={mode === "paper" ? "active" : ""} onClick={() => setMode("paper")}>PAPER</button>
            <button className={mode === "live" ? "active" : ""} onClick={() => setMode("live")}>LIVE</button>
          </div>
          <Link to="/terminal" className="btn btn-primary btn-sm">Open terminal</Link>
        </>}
      />
      <div className="dash-top" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr" }}>
        <Stat label={`Equity · ${active?.name || "Paper"}`} value={`$${equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`Open P&L ${openPnl >= 0 ? "+" : ""}${openPnl.toFixed(2)} · ${positions.length} open`} tone={openPnl >= 0 ? "up" : "down"} />
        <Stat label="Today's realized" value={`${stats.net >= 0 ? "+" : ""}$${stats.net.toFixed(0)}`} sub={`${stats.trades} closed · ${stats.winRate.toFixed(0)}% win`} />
        <Stat label={`${symbol} last`} value={formatPrice(symbol, lastPrice)} sub={`HARSI ${harsi ? harsi.value.toFixed(1) : "—"} · Pulse ${pulse?.score ?? "—"}`} />
        <Stat label="Max drawdown" value={`$${stats.maxDd.toFixed(0)}`} sub={`Profit factor ${stats.profitFactor.toFixed(2)}`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", gap: 14 }}>
        <div className="card">
          <h3 style={{ fontSize: 15 }}>Watchlist</h3>
          <Watchlist />
          <Link to="/terminal" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>Manage in terminal</Link>
        </div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15 }}>Equity curve (closed trades)</h3>
            <Link to="/analytics" className="faint">Analytics →</Link>
          </div>
          <EquityCurve points={stats.curve.map((c) => ({ eq: c.cum }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <Link to="/positions" className="btn btn-ghost btn-sm">Positions ({positions.length})</Link>
            <Link to="/signals" className="btn btn-ghost btn-sm">Signals ({signals.length})</Link>
            <Link to="/orders" className="btn btn-ghost btn-sm">Orders</Link>
            <Link to="/history" className="btn btn-ghost btn-sm">History</Link>
          </div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <SessionWidget />
          <div className="card">
            <h3 style={{ fontSize: 15 }}>Latest signals</h3>
            {signals.slice(0, 3).map((s) => (
              <div key={s.id} className={`alert-item ${s.side}`}>
                <b>{s.side.toUpperCase()} {s.symbol}</b> <span className="faint mono" style={{ fontSize: 11 }}>{s.algorithm}</span>
                <div className="muted" style={{ fontSize: 12 }}>{s.reason?.slice(0, 110)}</div>
              </div>
            ))}
            {!signals.length && <p className="muted">No signals yet.</p>}
            <Link to="/signals" className="btn btn-ghost btn-sm">Signal center</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
