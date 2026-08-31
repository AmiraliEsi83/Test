import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { countdownToLondon } from "../lib/sessions";
import { ALGORITHM_META } from "../lib/algorithms";

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
          <span className="kicker">
            <span className="dot" /> London T-15 automation
          </span>
          <h1>
            Open and close
            <br />
            with Harsi alerts.
          </h1>
          <p className="lead">
            HARSI is an AI session desk for subscribed traders. Fifteen minutes
            before London opens, the first print between −15 and −30 Harsi buys.
            The first print between +15 and +30 sells. Pulse Confluence adds a
            second professional buy/sell recommendation. Live chart. Broker
            execution.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary">
              Open a desk
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Sign in · trader@harsi.ai
            </Link>
          </div>
          <div className="stat-row">
            <div className="stat">
              <b className="mono">{clock.label}</b>
              <span>Until next London open</span>
            </div>
            <div className="stat">
              <b>2 algos</b>
              <span>Harsi + Pulse Confluence</span>
            </div>
            <div className="stat">
              <b>6 brokers</b>
              <span>OANDA, IBKR, MT5, Alpaca…</span>
            </div>
            <div className="stat">
              <b>Live</b>
              <span>Chart, positions, alerts</span>
            </div>
          </div>
        </div>
        <div className="hero-panel">
          <div className="chart-toolbar">
            <span>
              <span className="dot" /> EUR/USD · Harsi tape
            </span>
            <span className="badge badge-gold">T-15 window armed</span>
          </div>
          <PreviewTape />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Built like a desk, not a blog.</h2>
            <p>
              TradingView-grade tape, Bloomberg-style layout, and alerts that
              actually open and close risk — only for paid seats.
            </p>
          </div>
        </div>
        <div className="grid-3">
          {algos.map((a) => (
            <article className="card" key={a.id}>
              <span className="badge badge-gold">{a.badge}</span>
              <h3>{a.name}</h3>
              <p className="muted">{a.summary}</p>
              <Link to="/algorithms" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
                Read the rules
              </Link>
            </article>
          ))}
          <article className="card">
            <span className="badge badge-teal">Execution</span>
            <h3>Broker connect</h3>
            <p className="muted">
              Paper desk is live on day one. Attach OANDA, Interactive Brokers,
              MetaTrader 5, Alpaca, Binance, or FXCM and send marketables from
              the ticket or from an alert.
            </p>
            <Link to="/brokers" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
              Connect a venue
            </Link>
          </article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="grid-3">
          <article className="card">
            <h3>Subscribers get the alert.</h3>
            <p className="muted">
              Scout can watch the chart. Operator and Desk seats receive the
              opening print, the close, stop, and target — with sound and
              desktop notifications.
            </p>
          </article>
          <article className="card">
            <h3>One-tap from signal to fill.</h3>
            <p className="muted">
              Every Harsi or Pulse alert carries stop and target in pips.
              Execute on the connected broker or let Desk auto-execute.
            </p>
          </article>
          <article className="card">
            <h3>GitHub Pages domain</h3>
            <p className="muted">
              Live at{" "}
              <a href="https://AmiraliEsi83.github.io/Test/">
                https://AmiraliEsi83.github.io/Test/
              </a>
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

function PreviewTape() {
  const rows = [
    { t: "07:46:02", s: "HARSI BUY", d: "EURUSD · −18.4 pips", side: "buy" },
    { t: "07:46:02", s: "OPEN LONG", d: "0.10 lots · OANDA practice", side: "buy" },
    { t: "08:12:44", s: "PULSE SELL", d: "GBPUSD · score 81", side: "sell" },
    { t: "08:41:10", s: "CLOSE", d: "EURUSD · +16.2 pips · TP", side: "buy" },
  ];
  return (
    <div style={{ padding: 8 }}>
      {rows.map((r) => (
        <div
          key={r.t + r.s}
          className={`alert-item ${r.side}`}
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <div>
            <div className={`badge ${r.side === "buy" ? "badge-buy" : "badge-sell"}`}>
              {r.s}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {r.d}
            </div>
          </div>
          <span className="mono faint">{r.t}</span>
        </div>
      ))}
    </div>
  );
}
