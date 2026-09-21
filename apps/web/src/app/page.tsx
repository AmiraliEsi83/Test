"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PublicNav } from "@/components/PublicNav";

function TerminalPreview() {
  const [clock, setClock] = useState<any>(null);
  useEffect(() => {
    api("/api/sessions/clock").then(setClock).catch(() => null);
    const t = setInterval(() => api("/api/sessions/clock").then(setClock).catch(() => null), 1000);
    return () => clearInterval(t);
  }, []);
  const london = clock?.sessions?.find((s: any) => s.key === "london");
  return (
    <div className="hero-panel">
      <div className="panel-head">
        <span>
          <span className="dot" /> EUR/USD · HARSI tape <span className="badge badge-warn">SIMULATED</span>
        </span>
        <span className="badge badge-gold">{london?.open ? "London cash" : "Next London"} {london?.countdown?.label}</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              HARSI vs Asian mid
            </div>
            <div className="mono" style={{ fontSize: 28, color: "var(--buy)" }}>
              −22.4
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="badge badge-buy">BUY armed</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              First print −15 to −30
            </div>
          </div>
        </div>
        <svg viewBox="0 0 360 140" width="100%" height="140">
          <rect x="0" y="0" width="360" height="140" fill="#0c1018" />
          <line x1="0" y1="40" x2="360" y2="40" stroke="#7c6cff" strokeOpacity="0.4" />
          <line x1="0" y1="100" x2="360" y2="100" stroke="#7c6cff" strokeOpacity="0.4" />
          <polyline
            fill="none"
            stroke="#5eead4"
            strokeWidth="2"
            points="0,70 40,68 80,74 120,90 160,96 200,102 240,98 280,92 320,88 360,84"
          />
          <circle cx="200" cy="102" r="4" fill="#3dcfb0" />
        </svg>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Preview only. Live tape requires sign-in. Asian high/low drawn as range.
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      <PublicNav />
      <section className="hero">
        <div>
          <span className="kicker">
            <span className="dot" /> London T-15 research desk
          </span>
          <h1>
            Session signals.
            <br />
            Explicit conditions.
            <br />
            Paper first.
          </h1>
          <p className="lead">
            HARSI is a trading terminal for session algorithms. Fifteen minutes before London opens, the first HARSI print
            between −15 and −30 can alert BUY. The first print between +15 and +30 can alert SELL. Pulse and breakout
            modules add confluence — every trigger lists the exact checks that fired.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn btn-primary">
              Create an account
            </Link>
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
          </div>
          <div className="stat-row">
            <div className="stat">
              <b>3</b>
              <span>Strategy modules</span>
            </div>
            <div className="stat">
              <b>PAPER</b>
              <span>Desk always on</span>
            </div>
            <div className="stat">
              <b>OANDA / Alpaca</b>
              <span>Live only if connected</span>
            </div>
            <div className="stat">
              <b>Risk layer</b>
              <span>Before every order</span>
            </div>
          </div>
        </div>
        <TerminalPreview />
      </section>

      <section className="section" id="strategies">
        <div className="section-head">
          <div>
            <h2>Why a signal fired is the product.</h2>
            <p className="muted">No mystery confidence scores. Conditions are listed on every alert.</p>
          </div>
        </div>
        <div className="grid-3">
          <article className="card">
            <div className="badge badge-gold">Primary</div>
            <h3>London HARSI</h3>
            <p>
              Asian midpoint distance in pips. T-15 window. First print in −30/−15 buys; +15/+30 sells. Parameters are
              configurable: session, threshold, cooldown, max signals, weekdays.
            </p>
          </article>
          <article className="card">
            <div className="badge badge-teal">Desk rec.</div>
            <h3>Pulse Confluence</h3>
            <p>
              EMA 9/21, RSI, MACD histogram, ATR expansion, trend filter. Each check is marked pass/fail with the numeric
              value that produced it.
            </p>
          </article>
          <article className="card">
            <div className="badge">Research</div>
            <h3>Breakout + Trend</h3>
            <p>
              Higher-timeframe EMA 50, previous-session high/low, ATR expansion, volume confirmation. Research module —
              not a return guarantee.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <h2>Built like a desk</h2>
        <p className="muted">Watchlist, chart, blotter, risk, automation, and an audit trail in one workspace.</p>
        <div className="grid-3" style={{ marginTop: 20 }}>
          {[
            ["Live-looking chart", "Candles, sessions, EMA/RSI/MACD/ATR, entry/exit markers."],
            ["Paper engine", "Market, limit, stop, SL/TP, partial close, friction assumptions."],
            ["Risk manager", "Size, daily loss, consecutive losses, kill switch — before the broker."],
            ["Automation", "Alerts vs paper auto vs live auto. Live never silently arms."],
            ["Analytics & backtests", "Paper vs live labeled. Bar-close evaluation, no look-ahead."],
            ["Broker adapters", "Secrets stay on the server. Failed credentials stay NOT CONNECTED."],
          ].map(([t, d]) => (
            <article className="card" key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="markets">
        <h2>Markets</h2>
        <p className="muted">Architecture supports more instruments later. Public crypto tape is labeled PUBLIC FEED. FX is SIMULATED unless a market-data key is configured.</p>
        <div className="grid-3" style={{ marginTop: 16 }}>
          {["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD", "SPY", "QQQ"].map((s) => (
            <div className="card" key={s}>
              <b className="mono">{s}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="brokers">
        <h2>Brokers</h2>
        <div className="grid-3">
          <article className="card">
            <h3>Paper</h3>
            <p>Fully implemented. Simulated fills with spread, slippage, commission.</p>
            <div className="badge badge-teal">WORKING</div>
          </article>
          <article className="card">
            <h3>OANDA / Alpaca</h3>
            <p>Server-side adapters. Connect only with valid keys. Never fakes a live fill.</p>
            <div className="badge badge-gold">ADAPTER</div>
          </article>
          <article className="card">
            <h3>IBKR / MT5</h3>
            <p>Placeholders until a gateway/bridge is available. Shown as NOT CONNECTED.</p>
            <div className="badge">PLACEHOLDER</div>
          </article>
        </div>
      </section>

      <section className="section" id="security">
        <h2>Security</h2>
        <div className="grid-2">
          <article className="card">
            <h3>Server-side secrets</h3>
            <p>Broker tokens are encrypted at rest and never written to localStorage or frontend bundles.</p>
          </article>
          <article className="card">
            <h3>Authorization</h3>
            <p>Subscription features are enforced in the API. Hiding a React button is not access control.</p>
          </article>
        </div>
      </section>

      <section className="section faq">
        <h2>FAQ</h2>
        <details>
          <summary>Is this financial advice?</summary>
          <p className="muted">No. Signals are research outputs. They do not guarantee profit or fills.</p>
        </details>
        <details>
          <summary>Can it trade my live account?</summary>
          <p className="muted">Only after a Pro plan, a successful adapter connection, and an explicit live-automation confirmation. Otherwise the desk stays PAPER / NOT CONNECTED.</p>
        </details>
        <details>
          <summary>What is simulated?</summary>
          <p className="muted">FX candles without a data vendor key, paper fills, and demo checkout without Stripe keys. Each is labeled SIMULATED or PAPER.</p>
        </details>
      </section>

      <section className="section">
        <p className="disclaimer">
          Risk disclaimer: leveraged trading can result in loss of capital. HARSI does not execute live orders unless a
          configured broker adapter confirms them. Past or backtested results are not indicative of future performance.
        </p>
      </section>
      <footer className="public">
        <span>HARSI research terminal</span>
        <span>Not a broker. Not investment advice.</span>
      </footer>
    </div>
  );
}
