import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { countdownToLondon } from "../lib/sessions";
import { ALGORITHM_META } from "../lib/algorithms";
import { STRATEGY_META } from "../lib/strategies";

export default function Landing() {
  const [clock, setClock] = useState(countdownToLondon());
  useEffect(() => {
    const t = setInterval(() => setClock(countdownToLondon()), 1000);
    return () => clearInterval(t);
  }, []);

  const algos = useMemo(() => Object.values(ALGORITHM_META), []);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <span className="kicker"><span className="dot" /> Algo terminal · Paper + Live · SIMULATED demo data</span>
          <h1>Trade the London<br />open with HARSI.</h1>
          <p className="lead">
            HARSI is an AI-assisted trading terminal for subscribed traders. Fifteen minutes
            before London opens, the first print between −15 and −30 HARSI proposes BUY;
            +15 to +30 proposes SELL — each with entry, stop and target. Pulse Confluence
            (EMA + RSI + MACD + ATR) and Breakout + Trend add transparent, explainable
            recommendations. Paper trade, backtest, manage risk, then route to brokers.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary">Open a paper desk</Link>
            <Link to="/terminal" className="btn btn-ghost">Preview terminal</Link>
          </div>
          <div className="stat-row">
            <div className="stat"><b className="mono">{clock.label}</b><span>Until next London open</span></div>
            <div className="stat"><b>3 strategies</b><span>HARSI + Pulse + Breakout</span></div>
            <div className="stat"><b>8 markets</b><span>FX · Gold · Crypto · SPY/QQQ</span></div>
            <div className="stat"><b>Paper-first</b><span>Risk desk + audit log</span></div>
          </div>
        </div>
        <div className="hero-panel">
          <div className="chart-toolbar">
            <span><span className="dot" /> EUR/USD · HARSI tape · SIMULATED</span>
            <span className="badge badge-gold">T-15 window armed</span>
          </div>
          <PreviewTape />
          <div style={{ display: "flex", gap: 8, padding: 8 }}>
            <Link to="/signup" className="btn btn-primary btn-sm">Start free</Link>
            <Link to="/pricing" className="btn btn-ghost btn-sm">Free · Trader $49 · Pro $129</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Terminal, signals, execution.</h2>
            <p>Closer to TradingView + algo terminal + execution dashboard than a marketing page. Demo data is labeled SIMULATED.</p>
          </div>
          <Link to="/signup" className="btn btn-primary btn-sm">Create account</Link>
        </div>
        <div className="grid-3">
          {algos.map((a) => (
            <article className="card" key={a.id}>
              <span className="badge badge-gold">{a.badge}</span>
              <h3>{a.name}</h3>
              <p className="muted">{a.summary}</p>
              <Link to="/algorithms" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Read the rules</Link>
            </article>
          ))}
          <article className="card">
            <span className="badge badge-teal">{STRATEGY_META["breakout-trend"].badge}</span>
            <h3>Breakout + Trend</h3>
            <p className="muted">{STRATEGY_META["breakout-trend"].summary}</p>
            <Link to="/algorithms" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Read the rules</Link>
          </article>
          <article className="card">
            <span className="badge badge-teal">Execution</span>
            <h3>Paper first, brokers when ready</h3>
            <p className="muted">Paper desk fills instantly with persisted history. OANDA, Alpaca, IBKR adapters are real interfaces; MT5/FXCM are placeholders. Unconfigured venues show NOT CONNECTED.</p>
          </article>
          <article className="card">
            <span className="badge badge-teal">Risk + Audit</span>
            <h3>Risk manager in front of every order</h3>
            <p className="muted">Per-trade risk, daily loss cap, exposure caps, consecutive-loss stop and a global kill switch. Every block lands in the audit log.</p>
          </article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head"><div><h2>Markets & brokers</h2><p>FX majors, gold, crypto, SPY/QQQ. Architecture accepts more instruments without rewiring the terminal.</p></div></div>
        <div className="grid-3">
          <article className="card"><h3>Supported markets</h3><p className="muted">EUR/USD · GBP/USD · USD/JPY · XAU/USD · BTC/USDT · ETH/USDT · SPY · QQQ</p></article>
          <article className="card"><h3>Supported brokers</h3><p className="muted">Paper (working) · OANDA · Alpaca · Interactive Brokers · Binance (market data live) · MT5 / FXCM placeholders</p></article>
          <article className="card"><h3>Security</h3><p className="muted">Passwords hashed client-side in demo; production uses server auth + vault. No secrets in git. See .env.example.</p></article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="grid-3">
          <article className="card"><h3>Pricing</h3><p className="muted">Free: chart + paper. Trader $49: realtime alerts, analytics, backtests, paper automation. Pro $129: all strategies, brokers, webhooks.</p><Link to="/pricing" className="btn btn-ghost btn-sm">Compare plans</Link></article>
          <article className="card"><h3>FAQ</h3><p className="muted" style={{ fontSize: 13 }}>Is this financial advice? No — research signals. Do strategies guarantee returns? No. Can I paper trade free? Yes. Where do keys live? Server vault in production.</p></article>
          <article className="card"><h3>Risk disclaimer</h3><p className="muted" style={{ fontSize: 13 }}>Trading FX, metals, crypto and equities involves substantial risk of loss. Paper trade and backtest first. Never risk money you cannot afford to lose.</p></article>
        </div>
      </section>
    </div>
  );
}

function PreviewTape() {
  const rows = [
    { t: "07:46:02", s: "HARSI BUY", d: "EURUSD · −22.4 pips · SL 22 / TP 34", side: "buy" },
    { t: "07:46:02", s: "PAPER LONG", d: "0.10 lots · Paper desk [PAPER]", side: "buy" },
    { t: "08:12:44", s: "PULSE SELL", d: "GBPUSD · score 81 · EMA+RSI+MACD+ATR ✓", side: "sell" },
    { t: "08:41:10", s: "CLOSE +68.00", d: "EURUSD · Take profit · R:R 1.55", side: "buy" },
  ];
  return (
    <div style={{ padding: 8 }}>
      {rows.map((r) => (
        <div key={r.t + r.s} className={`alert-item ${r.side}`} style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className={`badge ${r.side === "buy" ? "badge-buy" : "badge-sell"}`}>{r.s}</div>
            <div className="muted" style={{ marginTop: 6 }}>{r.d}</div>
          </div>
          <span className="mono faint">{r.t}</span>
        </div>
      ))}
    </div>
  );
}
