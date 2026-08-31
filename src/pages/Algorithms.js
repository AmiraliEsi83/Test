import React, { useEffect, useState } from "react";
import { ALGORITHM_META } from "../lib/algorithms";
import { countdownToLondon } from "../lib/sessions";
import { useTrading } from "../context/TradingContext";
import { Link } from "react-router-dom";

export default function Algorithms() {
  const [clock, setClock] = useState(countdownToLondon());
  const trading = useTrading();

  useEffect(() => {
    const t = setInterval(() => setClock(countdownToLondon()), 1000);
    return () => clearInterval(t);
  }, []);

  const harsi = ALGORITHM_META["london-harsi"];
  const pulse = ALGORITHM_META["pulse-confluence"];

  return (
    <div className="page section">
      <div className="section-head">
        <div>
          <h2>Algorithms</h2>
          <p>
            Two engines. Harsi owns the London open. Pulse Confluence is the
            all-session recommendation stack used when the tape is trending.
          </p>
        </div>
        <div className="card" style={{ minWidth: 220 }}>
          <div className="faint">Next London open</div>
          <div className="clock">{clock.label}</div>
        </div>
      </div>

      <div className="algo-hero">
        <article className="card">
          <span className="badge badge-gold">{harsi.badge}</span>
          <h3 style={{ fontSize: 28, marginTop: 10 }}>{harsi.name}</h3>
          <p className="muted">{harsi.summary}</p>
          <ol className="rule-list">
            {harsi.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          {trading?.harsi && (
            <div className="harsi-meter" style={{ marginTop: 16 }}>
              Live Harsi {trading.harsi.value.toFixed(1)} pips · zone {trading.harsi.zone}
            </div>
          )}
        </article>
        <article className="card">
          <span className="badge badge-teal">{pulse.badge}</span>
          <h3 style={{ fontSize: 28, marginTop: 10 }}>{pulse.name}</h3>
          <p className="muted">{pulse.summary}</p>
          <ol className="rule-list">
            {pulse.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          {trading?.pulse && (
            <div style={{ marginTop: 16 }}>
              Score <b className="mono">{trading.pulse.score}</b>
              <p className="muted" style={{ fontSize: 13 }}>
                {(trading.pulse.reasons || []).slice(0, 3).join(" · ")}
              </p>
            </div>
          )}
        </article>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>How alerts become positions</h3>
        <p className="muted">
          When you are logged in on Operator or Desk, a qualifying print raises
          an opening alert. You can one-tap execute to the connected broker, or
          enable auto-execute on Desk. Stops and targets are attached. When
          price tags the stop, the target, or you flatten, a closing alert
          fires with P&L.
        </p>
        <Link to="/terminal" className="btn btn-primary" style={{ marginTop: 8 }}>
          Watch it on the terminal
        </Link>
      </div>
    </div>
  );
}
