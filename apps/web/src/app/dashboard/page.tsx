"use client";
import { Shell, Metric } from "@/components/Shell";
import { LiveChart } from "@/components/LiveChart";
import { api, money } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

function emaSeries(candles: any[], period: number) {
  if (!candles?.length) return [];
  const k = 2 / (period + 1);
  const out = [{ time: candles[0].time, value: candles[0].close }];
  for (let i = 1; i < candles.length; i += 1) {
    out.push({ time: candles[i].time, value: candles[i].close * k + out[i - 1].value * (1 - k) });
  }
  return out;
}

export default function DashboardPage() {
  const [dash, setDash] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [watch, setWatch] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [clock, setClock] = useState<any>(null);
  const [symbol, setSymbol] = useState("EURUSD");
  const [tf, setTf] = useState("1m");
  const [err, setErr] = useState("");
  const [ohlc, setOhlc] = useState("");

  async function refresh() {
    const [d, w, s, c, m] = await Promise.all([
      api<any>("/api/dashboard"),
      api<any>("/api/watchlist"),
      api<any>("/api/signals"),
      api<any>("/api/sessions/clock"),
      api<any>(`/api/market/${symbol}`),
    ]);
    setDash(d);
    setWatch(w.items);
    setSignals(s.signals);
    setClock(c);
    setMarket(m);
    const last = m.candles[m.candles.length - 1];
    if (last) setOhlc(`O ${last.open.toFixed(5)}  H ${last.high.toFixed(5)}  L ${last.low.toFixed(5)}  C ${last.close.toFixed(5)}`);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e.message));
    const t = setInterval(() => refresh().catch(() => null), 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const ema9 = useMemo(() => emaSeries(market?.candles || [], 9), [market]);
  const ema21 = useMemo(() => emaSeries(market?.candles || [], 21), [market]);

  return (
    <Shell>
      {err && <div className="err">{err}</div>}
      {!dash ? (
        <div className="skel" style={{ height: 40 }} />
      ) : (
        <>
          <div className="metrics">
            <Metric label="Equity" value={money(dash.equity, 0)} />
            <Metric label="Cash" value={money(dash.cash, 0)} />
            <Metric label="Buying power" value={money(dash.buyingPower, 0)} />
            <Metric label="Unrealized" value={money(dash.unrealizedPnl)} tone={dash.unrealizedPnl >= 0 ? "up" : "down"} />
            <Metric label="Realized" value={money(dash.realizedPnl)} tone={dash.realizedPnl >= 0 ? "up" : "down"} />
            <Metric label="Today" value={money(dash.todayPnl)} tone={dash.todayPnl >= 0 ? "up" : "down"} />
            <Metric label="Return" value={`${(dash.totalReturn * 100).toFixed(2)}%`} />
            <Metric label="Drawdown" value={`${(dash.drawdown * 100).toFixed(2)}%`} />
          </div>
          <div className="workspace">
            <div className="chart-box">
              <div className="chart-tools">
                <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                  {watch.map((w) => (
                    <option key={w.symbol} value={w.symbol}>
                      {w.label}
                    </option>
                  ))}
                </select>
                {["1m", "5m", "15m", "1h"].map((x) => (
                  <button key={x} className={tf === x ? "btn btn-sm btn-primary" : "btn btn-sm"} onClick={() => setTf(x)}>
                    {x}
                  </button>
                ))}
                <span className="badge badge-gold">{market?.feed || "SIMULATED"}</span>
                <span className="mono muted">{ohlc}</span>
              </div>
              {market && (
                <LiveChart candles={market.candles} asian={market.asian} emaFast={ema9} emaSlow={ema21} />
              )}
            </div>
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <h3>Sessions</h3>
                {clock?.sessions?.map((s: any) => (
                  <div key={s.key} className="cond">
                    <span>
                      {s.label} {s.open ? <span className="badge badge-teal">open</span> : <span className="badge">closed</span>}
                    </span>
                    <span className="mono">{s.countdown?.label}</span>
                  </div>
                ))}
                <p className="muted" style={{ fontSize: 12 }}>
                  Overlap: {clock?.overlapping?.join(", ") || "none"}
                </p>
              </div>
              <div className="card">
                <h3>Watchlist</h3>
                {watch.map((w) => (
                  <button key={w.symbol} className="linkish" style={{ width: "100%", display: "flex", justifyContent: "space-between", background: "none", border: 0, color: "inherit", padding: "6px 0" }} onClick={() => setSymbol(w.symbol)}>
                    <span>{w.label}</span>
                    <span className="mono">
                      {Number(w.price).toFixed(w.symbol.includes("USD") && w.symbol.length === 6 ? 5 : 2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Open positions · PAPER</h3>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Side</th>
                  <th>Size</th>
                  <th>Entry</th>
                  <th>Mark</th>
                  <th>P/L</th>
                  <th>Strategy</th>
                </tr>
              </thead>
              <tbody>
                {dash.positions?.length ? (
                  dash.positions.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.symbol}</td>
                      <td className={p.side === "buy" ? "up" : "down"}>{p.side}</td>
                      <td>{p.lots}</td>
                      <td>{p.entry}</td>
                      <td>{p.mark}</td>
                      <td className={p.pnl >= 0 ? "up" : "down"}>{money(p.pnl)}</td>
                      <td>{p.strategyId || "manual"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="empty">
                      No open positions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Recent signals {signals.length && <span className="badge">research</span>}</h3>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Algo</th>
                  <th>Asset</th>
                  <th>Side</th>
                  <th>Entry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 8).map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.createdAt).toLocaleString()}</td>
                    <td>{s.strategyId}</td>
                    <td>{s.symbol}</td>
                    <td className={s.side === "buy" ? "up" : "down"}>{s.side}</td>
                    <td>{s.entry}</td>
                    <td>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
