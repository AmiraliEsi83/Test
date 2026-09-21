import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { summarizeTrades, equitySeries } from "../lib/analytics";
import { PageHeader, Stat, EquityCurve, Empty } from "../components/ui";

export default function Analytics() {
  const { closed, brokers } = useTrading();
  const { plan } = useAuth();
  if (!plan.analytics) {
    return (
      <div className="page dash">
        <PageHeader kicker="Analytics" title="Performance" sub="Advanced analytics requires Trader or Pro." />
        <Empty title="Upgrade for analytics" sub="Win rate, profit factor, drawdown, breakdowns by strategy, symbol and weekday." action={<Link to="/pricing" className="btn btn-primary btn-sm">See plans</Link>} />
      </div>
    );
  }
  const s = summarizeTrades(closed);
  const curve = equitySeries(brokers.find((b) => b.id === "paper")?.balance || 100000, closed);
  const rr = s.avgLoss > 0 ? (s.avgWin / s.avgLoss).toFixed(2) : "—";
  return (
    <div className="page dash">
      <PageHeader kicker="Analytics · PAPER + LIVE" title="Performance" sub="Paper and live are labeled per trade. Curves below reflect closed paper fills (SIMULATED)." />
      <div className="card">
        <h3>Equity curve</h3>
        <EquityCurve points={curve} height={200} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Stat label="Net P/L" value={`${s.net >= 0 ? "+" : ""}$${s.net.toFixed(2)}`} />
        <Stat label="Win rate" value={`${s.winRate.toFixed(1)}%`} sub={`${s.wins}/${s.trades}`} />
        <Stat label="Profit factor" value={s.profitFactor.toFixed(2)} />
        <Stat label="Max drawdown" value={`$${s.maxDd.toFixed(2)}`} />
        <Stat label="Avg winner" value={`$${s.avgWin.toFixed(2)}`} />
        <Stat label="Avg loser" value={`-$${s.avgLoss.toFixed(2)}`} />
        <Stat label="Avg R:R" value={rr} />
        <Stat label="Trades/day" value={s.tradesPerDay.toFixed(1)} />
      </div>
      <div className="grid-3">
        <div className="card">
          <h3>By strategy</h3>
          {Object.entries(s.byStrategy).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>{k} · {v.n}</span>
              <span className={v.pnl >= 0 ? "up" : "down"}>{v.pnl >= 0 ? "+" : ""}{v.pnl.toFixed(2)}</span>
            </div>
          ))}
          {!Object.keys(s.byStrategy).length && <p className="muted">No data.</p>}
        </div>
        <div className="card">
          <h3>By symbol</h3>
          {Object.entries(s.bySymbol).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>{k} · {v.n}</span>
              <span className={v.pnl >= 0 ? "up" : "down"}>{v.pnl >= 0 ? "+" : ""}{v.pnl.toFixed(2)}</span>
            </div>
          ))}
          {!Object.keys(s.bySymbol).length && <p className="muted">No data.</p>}
        </div>
        <div className="card">
          <h3>Long vs short · Weekday</h3>
          <div style={{ fontSize: 13 }}>Long {s.bySide.buy.n} · {s.bySide.buy.pnl.toFixed(2)} USD</div>
          <div style={{ fontSize: 13 }}>Short {s.bySide.sell.n} · {s.bySide.sell.pnl.toFixed(2)} USD</div>
          <div style={{ marginTop: 8 }}>
            {Object.entries(s.byWeekday).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>{k} · {v.n}</span><span className={v.pnl >= 0 ? "up" : "down"}>{v.pnl.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
