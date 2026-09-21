"use client";
import { Shell, Metric } from "@/components/Shell";
import { api, money } from "@/lib/api";
import { useEffect, useState } from "react";

export default function BacktestPage() {
  const [form, setForm] = useState({
    strategyId: "london-harsi",
    symbol: "EURUSD",
    timeframe: "5m",
    start: new Date(Date.now() - 86400000 * 14).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
    startingBalance: 100000,
    lots: 0.1,
  });
  const [result, setResult] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<any>("/api/backtests")
      .then((d) => setRuns(d.runs))
      .catch((e) => setErr(e.message));
  }, []);
  return (
    <Shell>
      <h2>Backtest</h2>
      <p className="muted">Bar-close evaluation, no look-ahead. Feed: SIMULATED historical candles.</p>
      {err && <div className="card">{err}</div>}
      <div className="grid-2">
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            try {
              const res = await api("/api/backtest", { method: "POST", body: JSON.stringify(form) });
              setResult(res);
            } catch (ex) {
              setErr((ex as Error).message);
            }
          }}
        >
          <label>Strategy</label>
          <select value={form.strategyId} onChange={(e) => setForm({ ...form, strategyId: e.target.value })}>
            <option value="london-harsi">London HARSI</option>
            <option value="pulse-confluence">Pulse Confluence</option>
            <option value="breakout-trend">Breakout + Trend</option>
          </select>
          <label>Instrument</label>
          <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} />
          <label>Timeframe</label>
          <select value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })}>
            <option>1m</option><option>5m</option><option>15m</option><option>1h</option>
          </select>
          <label>Start</label>
          <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          <label>End</label>
          <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          <label>Starting balance</label>
          <input type="number" value={form.startingBalance} onChange={(e) => setForm({ ...form, startingBalance: Number(e.target.value) })} />
          <button className="btn btn-primary" style={{ marginTop: 16 }} type="submit">
            Run backtest
          </button>
        </form>
        {result && (
          <article className="card">
            <div className="badge badge-gold">{result.feed}</div>
            <div className="metrics" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Metric label="P/L" value={money(result.stats.pnl)} />
              <Metric label="Win rate" value={`${(result.stats.winRate * 100).toFixed(1)}%`} />
              <Metric label="Profit factor" value={result.stats.profitFactor.toFixed(2)} />
              <Metric label="Max DD" value={money(result.stats.maxDrawdown)} />
              <Metric label="Avg trade" value={money(result.stats.avgTrade)} />
              <Metric label="Trades" value={String(result.stats.trades)} />
            </div>
            <p className="muted">{result.note}</p>
          </article>
        )}
      </div>
      <h3>Saved runs</h3>
      {runs.map((r) => (
        <div className="cond" key={r.id}>
          <span>{r.strategyId} {r.symbol} {r.timeframe}</span>
          <span>{new Date(r.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </Shell>
  );
}
