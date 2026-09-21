"use client";
import { Shell, Metric } from "@/components/Shell";
import { api, money } from "@/lib/api";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/analytics")
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);
  if (err) {
    return (
      <Shell>
        <h2>Analytics</h2>
        <div className="card"><p>{err}</p><p className="muted">Trader plan required. Values below always state PAPER vs LIVE.</p></div>
      </Shell>
    );
  }
  const p = data?.paper;
  return (
    <Shell>
      <h2>Analytics</h2>
      <p className="badge badge-gold">PAPER unless noted</p>
      {!p ? (
        <div className="skel" />
      ) : (
        <>
          <div className="metrics">
            <Metric label="Win rate" value={`${(p.winRate * 100).toFixed(1)}%`} />
            <Metric label="Avg winner" value={money(p.avgWinner)} tone="up" />
            <Metric label="Avg loser" value={money(p.avgLoser)} tone="down" />
            <Metric label="Profit factor" value={p.profitFactor.toFixed(2)} />
            <Metric label="Max DD" value={money(p.maxDrawdown)} />
            <Metric label="Avg R:R" value={p.avgRiskReward.toFixed(2)} />
            <Metric label="Trades/day" value={p.tradesPerDay.toFixed(2)} />
            <Metric label="Long vs short" value={`${money(p.longPnl)} / ${money(p.shortPnl)}`} />
          </div>
          <div className="grid-2">
            <article className="card">
              <h3>By strategy (PAPER)</h3>
              {Object.entries(p.byStrategy || {}).map(([k, v]: any) => (
                <div className="cond" key={k}><span>{k}</span><span>{v.n} · {money(v.pnl)}</span></div>
              ))}
            </article>
            <article className="card">
              <h3>By symbol (PAPER)</h3>
              {Object.entries(p.bySymbol || {}).map(([k, v]: any) => (
                <div className="cond" key={k}><span>{k}</span><span>{v.n} · {money(v.pnl)}</span></div>
              ))}
            </article>
          </div>
          <article className="card" style={{ marginTop: 12 }}>
            <h3>Equity curve (PAPER)</h3>
            <svg viewBox="0 0 600 160" width="100%" height="160">
              <rect width="600" height="160" fill="#0c1018" />
              {data.equity?.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#5eead4"
                  strokeWidth="2"
                  points={data.equity
                    .map((p: any, i: number) => {
                      const xs = 600 / Math.max(data.equity.length - 1, 1);
                      const min = Math.min(...data.equity.map((x: any) => x.v));
                      const max = Math.max(...data.equity.map((x: any) => x.v));
                      const y = 140 - ((p.v - min) / Math.max(max - min, 1)) * 120;
                      return `${i * xs},${y}`;
                    })
                    .join(" ")}
                />
              )}
            </svg>
          </article>
          <p className="muted">Live analytics: {data?.live?.trades || 0} trades (none unless a live adapter fills).</p>
        </>
      )}
    </Shell>
  );
}
