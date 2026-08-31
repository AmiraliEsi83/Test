import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { countdownToLondon } from "../lib/sessions";
import { formatPrice } from "../lib/instruments";
import { AlertList } from "../components/alerts/AlertList";

export default function Dashboard() {
  const { user, plan } = useAuth();
  const { lastPrice, symbol, harsi, pulse, session, positions, brokers, settings, setSettings, requestNotifications } =
    useTrading();
  const [clock, setClock] = useState(countdownToLondon());

  useEffect(() => {
    const t = setInterval(() => setClock(countdownToLondon()), 1000);
    requestNotifications();
    return () => clearInterval(t);
  }, [requestNotifications]);

  const pnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);
  const equity = (brokers.find((b) => b.id === "paper")?.balance || 0) + pnl;

  return (
    <div className="page dash">
      <div>
        <div className="kicker">Good session, {user.name.split(" ")[0]}</div>
        <h2 style={{ fontSize: 36, marginTop: 8 }}>Desk overview</h2>
      </div>
      <div className="dash-top">
        <div className="card">
          <div className="faint">Paper equity</div>
          <div className="big-num">${equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className={pnl >= 0 ? "up" : "down"}>
            Open P&L {pnl >= 0 ? "+" : ""}
            {pnl.toFixed(2)} · {positions.length} positions
          </div>
        </div>
        <div className="card">
          <div className="faint">London open</div>
          <div className="clock">{clock.label}</div>
          <div className="muted">{session.note}</div>
        </div>
        <div className="card">
          <div className="faint">{symbol} last</div>
          <div className="big-num">{formatPrice(symbol, lastPrice)}</div>
          <div>
            Harsi{" "}
            <b className="mono">{harsi ? harsi.value.toFixed(1) : "—"}</b> · Pulse{" "}
            <b className="mono">{pulse?.score ?? "—"}</b>
          </div>
        </div>
      </div>
      <div className="grid-3">
        <div className="card">
          <h3>Seat</h3>
          <p>
            {plan.name} · {plan.alerts ? "live alerts on" : "alerts locked"}
          </p>
          <Link to="/pricing" className="btn btn-ghost btn-sm">
            Change plan
          </Link>
          <div className="field" style={{ marginTop: 16 }}>
            <label>
              <input
                type="checkbox"
                checked={settings.forceLondonWindow}
                onChange={(e) =>
                  setSettings({ ...settings, forceLondonWindow: e.target.checked })
                }
              />{" "}
              Arm Harsi T-15 demo window
            </label>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => setSettings({ ...settings, sound: e.target.checked })}
              />{" "}
              Sound on alert
            </label>
          </div>
          {plan.autoExecute && (
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoExecute}
                  onChange={(e) =>
                    setSettings({ ...settings, autoExecute: e.target.checked })
                  }
                />{" "}
                Auto-execute Harsi / Pulse
              </label>
            </div>
          )}
        </div>
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>Latest alerts</h3>
            <Link to="/alerts">All alerts</Link>
          </div>
          <AlertList compact />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link to="/terminal" className="btn btn-primary">
          Open live terminal
        </Link>
        <Link to="/brokers" className="btn btn-ghost">
          Connect broker
        </Link>
      </div>
    </div>
  );
}
