"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { INSTRUMENT_LIST, formatMoney, formatPrice, formatQty } from "@harsi/shared";
import { api } from "./api";
import { ChartPanel } from "./ChartPanel";
import { useToast } from "./AppShell";

interface Snapshot {
  symbol: string;
  timeframe: string;
  marketData: string;
  account: { equity: number; cash: number; buyingPower: number; unrealized: number; realized: number; openRisk: number; todayRealized: number; totalReturnPct: number; maxDrawdown: number };
  watch: { symbol: string; quote: { bid: number; ask: number; mid: number } | null; source: string }[];
  candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
  evaluations: { strategyId: string; name: string; enabled: boolean; checks: { id: string; label: string; pass: boolean; detail: string }[]; snapshot: Record<string, number | string | null>; signal: { side: string; entry: number; stop: number; target: number } | null }[];
  positions: { id: string; symbol: string; side: "buy" | "sell"; qty: number; entry: number; stop: number | null; target: number | null; mark: number; unrealized: number; strategyId: string | null }[];
  signals: { id: string; createdAt: string; side: "buy" | "sell"; strategyId: string; symbol: string }[];
  sessions: { id: string; label: string; open: boolean; weekend: boolean; labelCountdown: string; change: string }[];
  london: { hour: number; minute: number; weekday: string };
  clock: { hour: number; minute: number };
}

export function Terminal({ initialSymbol }: { initialSymbol: string }) {
  const router = useRouter();
  const toast = useToast();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState("5m");
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [calendar, setCalendar] = useState("");
  const [ticket, setTicket] = useState({ side: "buy" as "buy" | "sell", type: "market", qty: "10000", stop: "", target: "", limit: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = () => api<Snapshot>(`/api/dashboard?symbol=${symbol}&timeframe=${timeframe}`).then((next) => { if (!stop) { setData(next); setError(""); } }).catch((err) => { if (!stop) setError(err.message); });
    load();
    const timer = setInterval(load, 4000);
    api<{ message: string }>("/api/calendar").then((item) => setCalendar(item.message)).catch(() => undefined);
    return () => { stop = true; clearInterval(timer); };
  }, [symbol, timeframe]);

  async function submitOrder() {
    setBusy(true);
    try {
      const result = await api<{ marketData?: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          symbol,
          side: ticket.side,
          type: ticket.type,
          qty: Number(ticket.qty),
          limitPrice: ticket.limit ? Number(ticket.limit) : null,
          stopPrice: ticket.type === "stop" && ticket.limit ? Number(ticket.limit) : null,
          stopLoss: ticket.stop ? Number(ticket.stop) : null,
          takeProfit: ticket.target ? Number(ticket.target) : null,
        }),
      });
      toast(`Order accepted. Market data: ${result.marketData || "paper"}.`);
      const next = await api<Snapshot>(`/api/dashboard?symbol=${symbol}&timeframe=${timeframe}`);
      setData(next);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Order was not accepted.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function closePosition(id: string) {
    try {
      await api(`/api/positions/${id}/close`, { method: "POST", body: JSON.stringify({}) });
      toast("Paper position closed.");
      setData(await api<Snapshot>(`/api/dashboard?symbol=${symbol}&timeframe=${timeframe}`));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Close failed.", "err");
    }
  }

  const position = data?.positions.find((item) => item.symbol === symbol) ?? null;
  const account = data?.account;

  return (
    <div data-testid="dashboard">
      <div className="stats">
        {[
          ["Equity", account ? formatMoney(account.equity) : "—"],
          ["Cash", account ? formatMoney(account.cash) : "—"],
          ["Buying power", account ? formatMoney(account.buyingPower) : "—"],
          ["Unrealized", account ? formatMoney(account.unrealized) : "—"],
          ["Realized", account ? formatMoney(account.realized) : "—"],
          ["Today realized", account ? formatMoney(account.todayRealized) : "—"],
        ].map(([label, value]) => <div key={label} className="card stat"><span>{label}</span><b className="num">{value}</b></div>)}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="badge paper">Paper ledger</span>
        <span className={`badge ${data?.marketData === "binance-public" ? "ok" : "sim"}`}>{data?.marketData === "binance-public" ? "Public market data" : "Simulated tape"}</span>
        <span className="muted">Open risk {account ? formatMoney(account.openRisk) : "—"} · Drawdown {account ? formatMoney(account.maxDrawdown) : "—"} · Return {account ? `${account.totalReturnPct.toFixed(2)}%` : "—"}</span>
      </div>
      {error ? <div className="banner err" style={{ marginTop: 10 }}>{error}</div> : null}
      <div className="sessions" style={{ marginTop: 12 }}>
        {(data?.sessions ?? []).map((session) => (
          <div key={session.id} className="card session">
            <strong>{session.label}</strong>
            <span className={`badge ${session.open ? "ok" : ""}`}>{session.weekend ? "Weekend" : session.open ? "Open" : "Closed"}</span>
            <div className="num faint">{session.weekend ? "FX cash closed" : `${session.change === "close" ? "Closes" : "Opens"} ${session.labelCountdown}`}</div>
          </div>
        ))}
      </div>
      <p className="faint">London clock {data ? `${String(data.london.hour).padStart(2, "0")}:${String(data.london.minute).padStart(2, "0")} ${data.london.weekday}` : "—"} · HARSI uses London, not the timezone in the header.</p>
      <div className="watch" data-testid="watchlist">
        {(data?.watch ?? []).map((item) => (
          <button key={item.symbol} className={`btn ${item.symbol === symbol ? "active" : ""}`} type="button" onClick={() => setSymbol(item.symbol)}>
            <div>{item.symbol}</div>
            <div className="num">{item.quote ? formatPrice(item.symbol, item.quote.mid) : "—"}</div>
          </button>
        ))}
        <select className="btn" value="" onChange={(event) => { if (!event.target.value) return; api("/api/watchlist", { method: "POST", body: JSON.stringify({ symbol: event.target.value }) }).then(() => setSymbol(event.target.value)); }}>
          <option value="">Add symbol</option>
          {INSTRUMENT_LIST.map((item) => <option key={item.symbol} value={item.symbol}>{item.label}</option>)}
        </select>
      </div>
      <div className="terminal">
        {data ? (
          <ChartPanel
            symbol={symbol}
            timeframe={timeframe}
            candles={data.candles}
            signals={data.signals}
            source={data.marketData}
            position={position}
            onTimeframe={setTimeframe}
            onSignal={(id) => router.push(`/signals/${id}`)}
          />
        ) : <div className="card chart-card"><div className="pad"><div className="skeleton" /><div className="skeleton" style={{ marginTop: 8 }} /></div></div>}
        <aside className="rail">
          <form className="card pad stack" data-testid="order-ticket" onSubmit={(event) => { event.preventDefault(); submitOrder(); }}>
            <h2>Order ticket</h2>
            <span className="badge paper">This ticket follows the top-bar mode. Paper fills are not broker fills.</span>
            <div className="row">
              <button type="button" className={`btn buy ${ticket.side === "buy" ? "active" : ""}`} data-testid="side-buy" onClick={() => setTicket({ ...ticket, side: "buy" })}>Buy</button>
              <button type="button" className={`btn sell ${ticket.side === "sell" ? "active" : ""}`} data-testid="side-sell" onClick={() => setTicket({ ...ticket, side: "sell" })}>Sell</button>
            </div>
            <label className="field"><span>Type</span><select value={ticket.type} onChange={(event) => setTicket({ ...ticket, type: event.target.value })}><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select></label>
            <label className="field"><span>Quantity</span><input id="qty" value={ticket.qty} onChange={(event) => setTicket({ ...ticket, qty: event.target.value })} /></label>
            {ticket.type !== "market" ? <label className="field"><span>{ticket.type === "limit" ? "Limit" : "Stop"} price</span><input value={ticket.limit} onChange={(event) => setTicket({ ...ticket, limit: event.target.value })} /></label> : null}
            <label className="field"><span>Stop loss</span><input value={ticket.stop} onChange={(event) => setTicket({ ...ticket, stop: event.target.value })} /></label>
            <label className="field"><span>Take profit</span><input value={ticket.target} onChange={(event) => setTicket({ ...ticket, target: event.target.value })} /></label>
            <button className={`btn ${ticket.side === "buy" ? "buy" : "sell"}`} data-testid="submit-order" disabled={busy} type="submit">{busy ? "Sending" : `${ticket.side.toUpperCase()} ${symbol}`}</button>
          </form>
          {(data?.evaluations ?? []).map((item) => (
            <article key={item.strategyId} className="card pad">
              <div className="row"><h2>{item.name}</h2>{item.signal ? <span className={`badge ${item.signal.side}`}>{item.signal.side}</span> : <span className="badge">No signal</span>}</div>
              {item.checks.map((check) => <div key={check.id} className="check"><span>{check.label}</span><b className={check.pass ? "pass" : "fail"}>{check.pass ? "Yes" : "No"}</b></div>)}
              {item.signal ? <p className="num faint">Entry {formatPrice(symbol, item.signal.entry)} · Stop {formatPrice(symbol, item.signal.stop)} · Target {formatPrice(symbol, item.signal.target)}</p> : null}
            </article>
          ))}
          <article className="card pad">
            <h2>Calendar</h2>
            <p className="muted">{calendar || "Checking the calendar provider."}</p>
          </article>
        </aside>
      </div>
      <div className="card" style={{ marginTop: 12 }} data-testid="positions-table">
        <div className="pad"><h2>Open paper positions</h2></div>
        {data && data.positions.length === 0 ? <div className="empty">No open paper positions.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Symbol</th><th>Side</th><th className="num">Qty</th><th className="num">Entry</th><th className="num">Mark</th><th className="num">P/L</th><th></th></tr></thead>
              <tbody>
                {data?.positions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.symbol}</td>
                    <td><span className={`badge ${item.side}`}>{item.side}</span></td>
                    <td className="num">{formatQty(item.symbol, item.qty)}</td>
                    <td className="num">{formatPrice(item.symbol, item.entry)}</td>
                    <td className="num">{formatPrice(item.symbol, item.mark)}</td>
                    <td className={`num ${item.unrealized >= 0 ? "up" : "down"}`}>{formatMoney(item.unrealized)}</td>
                    <td><button className="btn" type="button" onClick={() => closePosition(item.id)}>Close</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
