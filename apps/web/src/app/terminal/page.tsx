"use client";
import { Shell } from "@/components/Shell";
import { LiveChart } from "@/components/LiveChart";
import { api, money } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

export default function TerminalPage() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [market, setMarket] = useState<any>(null);
  const [watch, setWatch] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [lots, setLots] = useState(0.1);
  const [msg, setMsg] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");

  async function load() {
    const [m, w, p] = await Promise.all([
      api<any>(`/api/market/${symbol}`),
      api<any>("/api/watchlist"),
      api<any>("/api/positions"),
    ]);
    setMarket(m);
    setWatch(w.items);
    setPos(p.positions);
  }
  useEffect(() => {
    load().catch((e) => setMsg(e.message));
    const t = setInterval(() => load().catch(() => null), 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const ema9 = useMemo(() => {
    const c = market?.candles || [];
    if (!c.length) return [];
    const k = 2 / 10;
    const out = [{ time: c[0].time, value: c[0].close }];
    for (let i = 1; i < c.length; i++) out.push({ time: c[i].time, value: c[i].close * k + out[i - 1].value * (1 - k) });
    return out;
  }, [market]);

  async function ticket(s: "buy" | "sell") {
    setMsg("");
    try {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({ symbol, side: s, type: "market", lots, mode: "paper" }),
      });
      setMsg(`PAPER ${s.toUpperCase()} submitted`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <Shell>
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
            <span className="badge badge-gold">{market?.feed}</span>
            <span className="mono">{market?.formatted}</span>
          </div>
          {market && <LiveChart candles={market.candles} asian={market.asian} emaFast={ema9} />}
        </div>
        <div className="card">
          <h3>Order ticket · PAPER</h3>
          <label>Lots</label>
          <input type="number" step="0.01" value={lots} onChange={(e) => setLots(Number(e.target.value))} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-buy" onClick={() => ticket("buy")}>
              BUY
            </button>
            <button className="btn btn-sell" onClick={() => ticket("sell")}>
              SELL
            </button>
          </div>
          {msg && <p className="muted">{msg}</p>}
          <h3 style={{ marginTop: 18 }}>Positions</h3>
          {pos.map((p) => (
            <div key={p.id} className="cond">
              <span>
                {p.symbol} {p.side} {p.lots}
              </span>
              <span className={p.pnl >= 0 ? "up" : "down"}>{money(p.pnl)}</span>
              <button
                className="btn btn-sm"
                onClick={async () => {
                  await api(`/api/positions/${p.id}/close`, { method: "POST", body: "{}" });
                  await load();
                }}
              >
                Close
              </button>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
