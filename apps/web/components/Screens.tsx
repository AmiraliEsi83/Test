"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { INSTRUMENT_LIST, TIMEFRAMES, formatMoney, formatPrice, formatQty } from "@harsi/shared";
import { api } from "./api";
import { useToast } from "./AppShell";

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancel = false;
    api<T>(path).then((next) => { if (!cancel) { setData(next); setError(""); } }).catch((err) => { if (!cancel) setError(err instanceof Error ? err.message : "Failed"); });
    return () => { cancel = true; };
  }, [path, nonce]);
  return { data, error, reload: () => setNonce((value) => value + 1) };
}

export function StrategiesScreen() {
  const toast = useToast();
  const { data, error, reload } = useLoad<{ strategies: { id: string; name: string; summary: string; disclaimer: string; enabled: boolean; symbols: string[]; timeframe: string; params: Record<string, unknown>; alerts: boolean; paperAuto: boolean; liveAuto: boolean; recent: { id: string; side: string; symbol: string; createdAt: string }[]; backtest: { netPnl?: number; trades?: number } | null }[] }>("/api/strategies");
  async function save(strategyId: string, patch: Record<string, unknown>) {
    try {
      await api("/api/strategies", { method: "PATCH", body: JSON.stringify({ strategyId, ...patch }) });
      toast("Strategy saved.");
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Not saved.", "err");
    }
  }
  if (error) return <div className="banner err">{error}</div>;
  if (!data) return <div className="skeleton" />;
  return (
    <div className="stack">
      <h1>Strategies</h1>
      {data.strategies.map((strategy) => (
        <article key={strategy.id} className="card pad stack">
          <div className="row">
            <h2>{strategy.name}</h2>
            <span className={`badge ${strategy.enabled ? "ok" : ""}`}>{strategy.enabled ? "Active" : "Inactive"}</span>
            <button className="btn" type="button" onClick={() => save(strategy.id, { enabled: !strategy.enabled })}>{strategy.enabled ? "Disable" : "Enable"}</button>
          </div>
          <p className="muted">{strategy.summary}</p>
          <p className="faint">{strategy.disclaimer}</p>
          <div className="row">
            <span className="badge">{strategy.timeframe}</span>
            {strategy.symbols.map((symbol) => <span key={symbol} className="badge">{symbol}</span>)}
          </div>
          <div className="grid-2">
            <label className="field"><span>Symbols</span><input defaultValue={strategy.symbols.join(",")} onBlur={(event) => save(strategy.id, { symbols: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
            <label className="field"><span>Timeframe</span><select defaultValue={strategy.timeframe} onChange={(event) => save(strategy.id, { timeframe: event.target.value })}>{TIMEFRAMES.map((item) => <option key={item.id}>{item.id}</option>)}</select></label>
          </div>
          <div className="grid-3">
            {Object.entries(strategy.params).filter(([, value]) => typeof value === "number").map(([key, value]) => (
              <label key={key} className="field"><span>{key}</span><input defaultValue={String(value)} onBlur={(event) => save(strategy.id, { params: { ...strategy.params, [key]: Number(event.target.value) } })} /></label>
            ))}
          </div>
          <div>
            <h3>Recent signals</h3>
            {strategy.recent.length === 0 ? <p className="muted">None yet.</p> : strategy.recent.map((signal) => <Link key={signal.id} href={`/signals/${signal.id}`}>{signal.side.toUpperCase()} {signal.symbol}</Link>)}
          </div>
          <p className="faint">{strategy.backtest ? `Latest saved test: ${strategy.backtest.trades ?? 0} trades, net ${formatMoney(strategy.backtest.netPnl ?? 0)}. Simulated.` : "No saved backtest yet."}</p>
        </article>
      ))}
    </div>
  );
}

export function SignalsScreen() {
  const [filters, setFilters] = useState({ strategy: "", symbol: "", side: "", status: "" });
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const { data, error } = useLoad<{ delayed: boolean; signals: { id: string; strategyId: string; symbol: string; timeframe: string; side: string; status: string; entry: number; stop: number; target: number; priceAt: number; createdAt: string; result: string; marketData: string }[] }>(`/api/signals?${query}`);
  return (
    <div>
      <h1>Signals</h1>
      {data?.delayed ? <div className="banner">Free plan shows signals after 15 minutes.</div> : null}
      <div className="filters">
        <select value={filters.strategy} onChange={(event) => setFilters({ ...filters, strategy: event.target.value })}><option value="">All strategies</option><option value="london-harsi">London HARSI</option><option value="pulse-confluence">Pulse</option><option value="breakout-trend">Breakout</option></select>
        <select value={filters.symbol} onChange={(event) => setFilters({ ...filters, symbol: event.target.value })}><option value="">All assets</option>{INSTRUMENT_LIST.map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select>
        <select value={filters.side} onChange={(event) => setFilters({ ...filters, side: event.target.value })}><option value="">Buy and sell</option><option value="buy">Buy</option><option value="sell">Sell</option></select>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Any status</option><option value="open">Open</option><option value="closed">Closed</option></select>
      </div>
      {error ? <div className="banner err">{error}</div> : null}
      <div className="card table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Time</th><th>Strategy</th><th>Asset</th><th>Side</th><th className="num">Entry</th><th className="num">Stop</th><th className="num">Target</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            {data?.signals.map((signal) => (
              <tr key={signal.id}>
                <td className="num">{new Date(signal.createdAt).toLocaleString()}</td>
                <td><Link href={`/signals/${signal.id}`}>{signal.strategyId}</Link></td>
                <td>{signal.symbol} {signal.timeframe}</td>
                <td><span className={`badge ${signal.side}`}>{signal.side}</span></td>
                <td className="num">{formatPrice(signal.symbol, signal.entry)}</td>
                <td className="num">{formatPrice(signal.symbol, signal.stop)}</td>
                <td className="num">{formatPrice(signal.symbol, signal.target)}</td>
                <td>{signal.status} {signal.result}</td>
                <td><span className="badge sim">{signal.marketData}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.signals.length === 0 ? <div className="empty">No signals match these filters.</div> : null}
      </div>
    </div>
  );
}

export function SignalDetail({ id }: { id: string }) {
  const { data, error } = useLoad<{ signal: { strategyId: string; symbol: string; timeframe: string; side: string; entry: number; stop: number; target: number; createdAt: string; marketData: string; status: string; result: string; resultPnl: number | null; riskReward: number | null; reasons: string[]; checks: { label: string; pass: boolean; detail: string }[]; indicators: Record<string, number> } }>(`/api/signals/${id}`);
  if (error) return <div className="banner err">{error}</div>;
  if (!data) return <div className="skeleton" />;
  const signal = data.signal;
  return (
    <article className="card pad stack">
      <div className="row"><h1>{signal.strategyId}</h1><span className={`badge ${signal.side}`}>{signal.side}</span><span className="badge sim">{signal.marketData}</span></div>
      <p>{signal.symbol} · {signal.timeframe} · {new Date(signal.createdAt).toLocaleString()}</p>
      <div className="stats">
        <div className="card stat"><span>Entry</span><b className="num">{formatPrice(signal.symbol, signal.entry)}</b></div>
        <div className="card stat"><span>Stop</span><b className="num">{formatPrice(signal.symbol, signal.stop)}</b></div>
        <div className="card stat"><span>Target</span><b className="num">{formatPrice(signal.symbol, signal.target)}</b></div>
        <div className="card stat"><span>Risk / reward</span><b className="num">{signal.riskReward?.toFixed(2) ?? "—"}</b></div>
      </div>
      {signal.checks.map((check) => <div key={check.label} className="check"><div><b className={check.pass ? "pass" : "fail"}>{check.pass ? "Yes" : "No"}</b> {check.label}</div><span className="muted">{check.detail}</span></div>)}
      <ul>{signal.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <p className="faint">Status {signal.status} {signal.result} {signal.resultPnl != null ? formatMoney(signal.resultPnl) : ""}. This is a research record.</p>
    </article>
  );
}

export function PositionsScreen() {
  const toast = useToast();
  const { data, error, reload } = useLoad<{ positions: { id: string; symbol: string; side: "buy" | "sell"; qty: number; entry: number; stop: number | null; target: number | null; status: string; strategyId: string | null; openedAt: number }[] }>("/api/positions");
  const [partial, setPartial] = useState<Record<string, string>>({});
  async function act(path: string, payload: unknown, ok: string) {
    try {
      await api(path, { method: path.endsWith("/close") || path.endsWith("close-all") ? "POST" : "PATCH", body: JSON.stringify(payload) });
      toast(ok);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Not completed.", "err");
    }
  }
  const open = data?.positions.filter((position) => position.status === "open") ?? [];
  return (
    <div>
      <div className="row"><h1>Positions</h1><button className="btn danger" type="button" onClick={() => act("/api/positions/close-all", {}, "Close-all requested.")}>Close all paper</button></div>
      {error ? <div className="banner err">{error}</div> : null}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Asset</th><th>Side</th><th className="num">Size</th><th className="num">Entry</th><th>Stop</th><th>Target</th><th>Strategy</th><th>Opened</th><th></th></tr></thead>
          <tbody>
            {open.map((position) => (
              <tr key={position.id}>
                <td>{position.symbol}</td>
                <td><span className={`badge ${position.side}`}>{position.side}</span></td>
                <td className="num">{formatQty(position.symbol, position.qty)}</td>
                <td className="num">{formatPrice(position.symbol, position.entry)}</td>
                <td><input defaultValue={position.stop ?? ""} onBlur={(event) => act(`/api/positions/${position.id}`, { stop: event.target.value ? Number(event.target.value) : null }, "Stop updated.")} /></td>
                <td><input defaultValue={position.target ?? ""} onBlur={(event) => act(`/api/positions/${position.id}`, { target: event.target.value ? Number(event.target.value) : null }, "Target updated.")} /></td>
                <td>{position.strategyId || "manual"}</td>
                <td className="num">{new Date(position.openedAt).toLocaleString()}</td>
                <td className="row">
                  <input style={{ width: 80 }} value={partial[position.id] || ""} placeholder="qty" onChange={(event) => setPartial({ ...partial, [position.id]: event.target.value })} />
                  <button className="btn" type="button" onClick={() => act(`/api/positions/${position.id}/close`, { qty: partial[position.id] ? Number(partial[position.id]) : null }, "Position reduced.")}>Close</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {open.length === 0 ? <div className="empty">No open paper positions.</div> : null}
      </div>
    </div>
  );
}

export function OrdersScreen() {
  const toast = useToast();
  const { data, error, reload } = useLoad<{ orders: { id: string; symbol: string; side: string; type: string; qty: number; status: string; avgPrice: number | null; limitPrice: number | null; rejectReason: string; createdAt: number }[] }>("/api/orders");
  const [tab, setTab] = useState("pending");
  const groups = useMemo(() => data?.orders ?? [], [data]);
  const rows = groups.filter((order) => (tab === "open" ? order.status === "pending" || order.status === "filled" : order.status === tab));
  return (
    <div>
      <h1>Orders</h1>
      <div className="filters">{["pending", "filled", "cancelled", "rejected", "open"].map((item) => <button key={item} className={`btn ${tab === item ? "active" : ""}`} type="button" onClick={() => setTab(item)}>{item}</button>)}</div>
      {error ? <div className="banner err">{error}</div> : null}
      <div className="card table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Symbol</th><th>Side</th><th>Type</th><th className="num">Qty</th><th>Status</th><th className="num">Price</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id}>
                <td>{order.symbol}</td><td>{order.side}</td><td>{order.type}</td><td className="num">{order.qty}</td><td>{order.status}</td>
                <td className="num">{order.avgPrice ?? order.limitPrice ?? "—"}</td><td>{order.rejectReason}</td>
                <td>{order.status === "pending" ? <button className="btn" type="button" onClick={() => api(`/api/orders/${order.id}/cancel`, { method: "POST" }).then(() => { toast("Order cancelled."); reload(); }).catch((err) => toast(err.message, "err"))}>Cancel</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="empty">Nothing in this bucket.</div> : null}
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const { data, error } = useLoad<{ trades: { id: string; symbol: string; side: string; qty: number; entry: number; exit: number; pnl: number; commission: number; strategyId: string | null; reason: string; openedAt: number; closedAt: number; mode: string }[] }>("/api/history");
  const [q, setQ] = useState("");
  const rows = (data?.trades ?? []).filter((trade) => `${trade.symbol} ${trade.strategyId} ${trade.side}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h1>Trade history</h1>
      <p className="badge paper">Paper ledger</p>
      <input placeholder="Search symbol or strategy" value={q} onChange={(event) => setQ(event.target.value)} />
      {error ? <div className="banner err">{error}</div> : null}
      <div className="card table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Symbol</th><th>Side</th><th className="num">Entry</th><th className="num">Exit</th><th className="num">Net</th><th>Strategy</th><th>Duration</th><th>Mode</th></tr></thead>
          <tbody>
            {rows.map((trade) => (
              <tr key={trade.id}>
                <td>{trade.symbol}</td><td>{trade.side}</td>
                <td className="num">{formatPrice(trade.symbol, trade.entry)}</td>
                <td className="num">{formatPrice(trade.symbol, trade.exit)}</td>
                <td className={`num ${trade.pnl - trade.commission >= 0 ? "up" : "down"}`}>{formatMoney(trade.pnl - trade.commission)}</td>
                <td>{trade.strategyId || "manual"} · {trade.reason}</td>
                <td className="num">{Math.round((trade.closedAt - trade.openedAt) / 60000)}m</td>
                <td>{trade.mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="empty">No paper trades yet.</div> : null}
      </div>
    </div>
  );
}

export function AnalyticsScreen() {
  const { data, error } = useLoad<{ source: string; stats: { trades: number; netPnl: number; winRate: number | null; averageWinner: number | null; averageLoser: number | null; profitFactor: number | null; maxDrawdown: number; averageR: number | null; tradesPerDay: number | null; equity: { equity: number }[]; byStrategy: Record<string, number>; bySymbol: Record<string, number>; byWeekday: Record<string, number>; longNet: number; shortNet: number } }>("/api/analytics");
  if (error) return <div className="banner err">{error}</div>;
  if (!data) return <div className="skeleton" />;
  const points = data.stats.equity;
  const min = Math.min(...points.map((point) => point.equity));
  const max = Math.max(...points.map((point) => point.equity));
  const span = max - min || 1;
  const poly = points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${42 - ((point.equity - min) / span) * 36}`).join(" ");
  return (
    <div className="stack">
      <h1>Analytics</h1>
      <span className="badge paper">Calculated from {data.source} trades only</span>
      <svg viewBox="0 0 100 46" style={{ width: "100%", background: "#101318", border: "1px solid #2a303a", borderRadius: 12 }}><polyline fill="none" stroke="#d7b56a" strokeWidth="0.7" points={poly} /></svg>
      <div className="stats">
        {[
          ["Trades", String(data.stats.trades)],
          ["Net P/L", formatMoney(data.stats.netPnl)],
          ["Win rate", data.stats.winRate == null ? "—" : `${(data.stats.winRate * 100).toFixed(1)}%`],
          ["Avg winner", formatMoney(data.stats.averageWinner)],
          ["Avg loser", formatMoney(data.stats.averageLoser)],
          ["Profit factor", data.stats.profitFactor == null ? "—" : data.stats.profitFactor.toFixed(2)],
          ["Max drawdown", formatMoney(data.stats.maxDrawdown)],
          ["Avg R", data.stats.averageR == null ? "—" : data.stats.averageR.toFixed(2)],
          ["Trades / day", data.stats.tradesPerDay == null ? "—" : data.stats.tradesPerDay.toFixed(2)],
          ["Long net", formatMoney(data.stats.longNet)],
          ["Short net", formatMoney(data.stats.shortNet)],
        ].map(([label, value]) => <div key={label} className="card stat"><span>{label}</span><b className="num">{value}</b></div>)}
      </div>
      <div className="grid-3">
        {[["Strategy", data.stats.byStrategy], ["Symbol", data.stats.bySymbol], ["Weekday", data.stats.byWeekday]].map(([title, rows]) => (
          <article key={String(title)} className="card pad">
            <h2>{title as string}</h2>
            {Object.entries(rows as Record<string, number>).map(([key, value]) => <div key={key} className="check"><span>{key}</span><b className="num">{formatMoney(value)}</b></div>)}
          </article>
        ))}
      </div>
    </div>
  );
}

export function BacktestScreen() {
  const toast = useToast();
  const { data, reload } = useLoad<{ runs: { id: string; strategyId: string; symbol: string; timeframe: string; createdAt: string; results: { netPnl?: number; trades?: number; maxDrawdown?: number; profitFactor?: number | null } }[] }>("/api/backtest");
  const [result, setResult] = useState<{ stats: { netPnl: number; trades: number; winRate: number | null; profitFactor: number | null; maxDrawdown: number; equity: { equity: number }[] }; marketData: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const next = await api<NonNullable<typeof result>>("/api/backtest", { method: "POST", body: JSON.stringify({ strategyId: form.get("strategyId"), symbol: form.get("symbol"), timeframe: form.get("timeframe"), startDate: form.get("startDate"), endDate: form.get("endDate"), starting: Number(form.get("starting")) }) });
      setResult(next);
      toast("Backtest saved. The tape was simulated.");
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Backtest was not run.", "err");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <h1>Backtest</h1>
      <p className="muted">Walks closed bars only. If a bar touches both stop and target, the stop is used. Results are simulated.</p>
      <form className="card pad grid-3" onSubmit={submit}>
        <label className="field"><span>Strategy</span><select name="strategyId"><option value="london-harsi">London HARSI</option><option value="pulse-confluence">Pulse</option><option value="breakout-trend">Breakout</option></select></label>
        <label className="field"><span>Symbol</span><select name="symbol">{INSTRUMENT_LIST.map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></label>
        <label className="field"><span>Timeframe</span><select name="timeframe" defaultValue="15m">{TIMEFRAMES.map((item) => <option key={item.id}>{item.id}</option>)}</select></label>
        <label className="field"><span>Start</span><input name="startDate" type="date" required defaultValue="2026-02-01" /></label>
        <label className="field"><span>End</span><input name="endDate" type="date" required defaultValue="2026-03-01" /></label>
        <label className="field"><span>Starting balance</span><input name="starting" type="number" defaultValue={100000} /></label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Running" : "Run"}</button>
      </form>
      {result ? <div className="banner ok">Simulated · {result.stats.trades} trades · net {formatMoney(result.stats.netPnl)} · drawdown {formatMoney(result.stats.maxDrawdown)}</div> : null}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>When</th><th>Strategy</th><th>Symbol</th><th className="num">Trades</th><th className="num">Net</th></tr></thead>
          <tbody>{data?.runs.map((run) => <tr key={run.id}><td>{new Date(run.createdAt).toLocaleString()}</td><td>{run.strategyId}</td><td>{run.symbol} {run.timeframe}</td><td className="num">{run.results.trades ?? "—"}</td><td className="num">{formatMoney(run.results.netPnl)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export function BrokersScreen() {
  const toast = useToast();
  const { data, error, reload } = useLoad<{ brokers: { id: string; name: string; blurb: string; kind: string; status: string; environment: string; accountLabel: string; lastSyncAt: string | null; lastError: string }[] }>("/api/brokers");
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  async function connect(broker: string) {
    try {
      await api("/api/brokers/connect", { method: "POST", body: JSON.stringify({ broker, values: values[broker] || {} }) });
      toast(`${broker} responded.`);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Not connected.", "err");
      reload();
    }
  }
  const fields: Record<string, string[]> = { oanda: ["accountId", "apiKey", "environment"], alpaca: ["keyId", "secret", "environment"], ibkr: ["accountId", "host", "port"], mt5: [] };
  return (
    <div className="stack">
      <h1>Brokers</h1>
      {error ? <div className="banner err">{error}</div> : null}
      <div className="grid-2">
        {data?.brokers.map((broker) => (
          <article key={broker.id} className="card pad stack">
            <div className="row"><h2>{broker.name}</h2><span className={`badge ${broker.status === "connected" ? "ok" : "warn"}`}>{broker.status.replaceAll("_", " ")}</span></div>
            <p className="muted">{broker.blurb}</p>
            <p className="faint">Environment {broker.environment || "—"} · Account {broker.accountLabel || "—"} · Sync {broker.lastSyncAt ? new Date(broker.lastSyncAt).toLocaleString() : "never"}</p>
            {broker.lastError ? <div className="banner">{broker.lastError}</div> : null}
            {(fields[broker.id] || []).map((field) => <label key={field} className="field"><span>{field}</span><input type={field.toLowerCase().includes("secret") || field === "apiKey" ? "password" : "text"} onChange={(event) => setValues({ ...values, [broker.id]: { ...(values[broker.id] || {}), [field]: event.target.value } })} /></label>)}
            <div className="row">
              {broker.id !== "mt5" ? <button className="btn" type="button" onClick={() => connect(broker.id)}>{broker.id === "paper" ? "Reconnect paper" : "Test connection"}</button> : null}
              {broker.status === "connected" && broker.id !== "paper" ? <button className="btn" type="button" onClick={() => api(`/api/brokers/${broker.id}/sync`, { method: "POST" }).then(() => { toast("Sync finished."); reload(); }).catch((err) => toast(err.message, "err"))}>Sync</button> : null}
              {broker.id !== "paper" ? <button className="btn danger" type="button" onClick={() => api(`/api/brokers/${broker.id}/disconnect`, { method: "POST" }).then(() => { toast("Disconnected."); reload(); })}>Disconnect</button> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AutomationScreen() {
  const toast = useToast();
  const { data, error, reload } = useLoad<{ liveArmed: boolean; mode: string; strategies: { strategyId: string; name: string; alerts: boolean; paperAuto: boolean; liveAuto: boolean }[] }>("/api/automation");
  const [phrase, setPhrase] = useState("");
  async function patch(strategyId: string, body: Record<string, unknown>) {
    try {
      await api("/api/strategies", { method: "PATCH", body: JSON.stringify({ strategyId, ...body, confirmation: phrase }) });
      toast("Automation updated.");
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Not updated.", "err");
    }
  }
  return (
    <div className="stack">
      <h1>Automation</h1>
      {error ? <div className="banner err">{error}</div> : null}
      <div className="banner">Live automation is {data?.liveArmed ? "armed" : "not armed"}. Mode is {data?.mode}. Alerts are notifications. Paper auto and live auto place orders.</div>
      <label className="field"><span>Confirmation for live</span><input value={phrase} placeholder="ENABLE LIVE" onChange={(event) => setPhrase(event.target.value)} /></label>
      {data?.strategies.map((strategy) => (
        <article key={strategy.strategyId} className="card pad row">
          <strong style={{ width: 180 }}>{strategy.name}</strong>
          <label><input type="checkbox" checked={strategy.alerts} onChange={(event) => patch(strategy.strategyId, { alerts: event.target.checked })} /> Alerts</label>
          <label><input type="checkbox" checked={strategy.paperAuto} onChange={(event) => patch(strategy.strategyId, { paperAuto: event.target.checked })} /> Paper auto-execute</label>
          <label><input type="checkbox" checked={strategy.liveAuto} onChange={(event) => patch(strategy.strategyId, { liveAuto: event.target.checked })} /> Live auto-execute</label>
        </article>
      ))}
      <button className="btn danger" type="button" onClick={() => api("/api/automation/stop", { method: "POST" }).then(() => { toast("Automation stopped. Mode is paper."); reload(); })}>Stop all automation</button>
    </div>
  );
}

export function SettingsScreen() {
  const toast = useToast();
  const { data, reload } = useLoad<{ user: { name: string; email: string; timezone: string; plan: string; planSource: string; planNote: string; prefs: Record<string, string | boolean>; risk: Record<string, number | boolean> } | null }>("/api/auth/me");
  const user = data?.user;
  if (!user) return <div className="skeleton" />;
  async function save(path: string, payload: unknown, ok: string) {
    try {
      await api(path, { method: "PATCH", body: JSON.stringify(payload) });
      toast(ok);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Not saved.", "err");
    }
  }
  return (
    <div className="stack">
      <h1>Settings</h1>
      <form className="card pad stack" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); save("/api/settings", { name: form.get("name"), timezone: form.get("timezone"), defaultSymbol: form.get("defaultSymbol"), chartTimeframe: form.get("chartTimeframe") }, "Profile saved."); }}>
        <h2>Profile and chart</h2>
        <label className="field"><span>Name</span><input name="name" defaultValue={user.name} /></label>
        <label className="field"><span>Email</span><input value={user.email} disabled /></label>
        <label className="field"><span>Timezone</span><input name="timezone" defaultValue={user.timezone} /></label>
        <label className="field"><span>Default symbol</span><select name="defaultSymbol" defaultValue={String(user.prefs.defaultSymbol)}>{INSTRUMENT_LIST.map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></label>
        <label className="field"><span>Chart timeframe</span><select name="chartTimeframe" defaultValue={String(user.prefs.chartTimeframe)}>{TIMEFRAMES.map((item) => <option key={item.id}>{item.id}</option>)}</select></label>
        <button className="btn" type="submit">Save profile</button>
      </form>
      <form className="card pad grid-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const payload = Object.fromEntries([...form.entries()].map(([key, value]) => [key, key === "killSwitch" ? value === "on" : Number(value)])); payload.killSwitch = form.get("killSwitch") === "on"; save("/api/risk", payload, "Risk saved."); }}>
        <h2>Risk</h2>
        {Object.entries(user.risk).filter(([key]) => key !== "killSwitch").map(([key, value]) => <label key={key} className="field"><span>{key}</span><input name={key} defaultValue={String(value)} /></label>)}
        <label><input name="killSwitch" type="checkbox" defaultChecked={Boolean(user.risk.killSwitch)} /> Daily kill switch</label>
        <button className="btn" type="submit">Save risk</button>
      </form>
      <form className="card pad stack" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const flags = ["browserAlerts", "emailAlerts", "notifySignal", "notifyEntry", "notifyExit", "notifyStop", "notifyTarget", "notifyBroker", "notifyRisk"]; const payload: Record<string, unknown> = { webhookUrl: form.get("webhookUrl") || undefined }; flags.forEach((flag) => { payload[flag] = form.get(flag) === "on"; }); save("/api/settings", payload, "Notifications saved."); }}>
        <h2>Notifications</h2>
        <p className="faint">Email delivery needs SMTP_URL. Until then, alerts stay in the terminal.</p>
        {["browserAlerts", "emailAlerts", "notifySignal", "notifyEntry", "notifyExit", "notifyStop", "notifyTarget", "notifyBroker", "notifyRisk"].map((flag) => <label key={flag}><input name={flag} type="checkbox" defaultChecked={Boolean(user.prefs[flag])} /> {flag}</label>)}
        <label className="field"><span>Webhook URL</span><input name="webhookUrl" placeholder={user.prefs.webhookSet ? "Stored on the server" : "Not set"} /></label>
        <button className="btn" type="submit">Save notifications</button>
      </form>
      <form className="card pad stack" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); api("/api/auth/password", { method: "POST", body: JSON.stringify({ current: form.get("current"), next: form.get("next") }) }).then(() => toast("Password changed.")).catch((err) => toast(err.message, "err")); }}>
        <h2>Security</h2>
        <label className="field"><span>Current password</span><input name="current" type="password" /></label>
        <label className="field"><span>New password</span><input name="next" type="password" minLength={8} /></label>
        <button className="btn" type="submit">Change password</button>
      </form>
      <article className="card pad">
        <h2>Subscription</h2>
        <p>{user.plan} · {user.planSource} · {user.planNote || "No note."}</p>
        <div className="row">
          {["free", "trader", "pro"].map((plan) => <button key={plan} className="btn" type="button" onClick={() => api<{ simulated?: boolean }>("/api/subscription", { method: "POST", body: JSON.stringify({ plan }) }).then((result) => toast(result.simulated ? `Simulated change to ${plan}. Stripe was not charged.` : "Checkout started.")).catch((err) => toast(err.message, "err"))}>{plan}</button>)}
        </div>
      </article>
    </div>
  );
}

export function ActivityScreen() {
  const { data, error } = useLoad<{ audits: { id: string; action: string; detail: string; createdAt: string }[] }>("/api/audit");
  return (
    <div>
      <h1>Activity</h1>
      {error ? <div className="banner err">{error}</div> : null}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>{data?.audits.map((row) => <tr key={row.id}><td className="num">{new Date(row.createdAt).toLocaleString()}</td><td>{row.action}</td><td>{row.detail}</td></tr>)}</tbody>
        </table>
        {data && data.audits.length === 0 ? <div className="empty">No activity yet.</div> : null}
      </div>
    </div>
  );
}

export function PricingActions() {
  const toast = useToast();
  return (
    <div className="row">
      {["free", "trader", "pro"].map((plan) => <button key={plan} className="btn" type="button" onClick={() => api("/api/subscription", { method: "POST", body: JSON.stringify({ plan }) }).then(() => toast(`Requested ${plan}.`)).catch((err) => toast(err.message, "err"))}>{plan}</button>)}
    </div>
  );
}
