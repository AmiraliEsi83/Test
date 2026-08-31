import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTrading } from "../../context/TradingContext";

export function AlertList({ compact }) {
  const { plan } = useAuth();
  const { alerts, executeFromAlert } = useTrading();
  const list = compact ? alerts.slice(0, 8) : alerts;

  if (!list.length) {
    return <p className="muted">No alerts yet. Leave the terminal open through the London T-15 window.</p>;
  }

  return (
    <div>
      {list.map((a) => (
        <div key={a.id} className={`alert-item ${a.side || ""}`}>
          <div className={a.locked && !plan.alerts ? "locked" : ""}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong>{a.title}</strong>
              <span className="faint mono" style={{ fontSize: 11 }}>
                {new Date(a.ts).toLocaleTimeString()}
              </span>
            </div>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
              {a.message}
            </p>
          </div>
          {a.locked && !plan.alerts && (
            <Link to="/pricing" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
              Unlock live alerts
            </Link>
          )}
          {plan.execute && a.actionable && !a.locked && (
            <button
              className={`btn btn-sm ${a.side === "buy" ? "btn-buy" : "btn-sell"}`}
              style={{ marginTop: 10 }}
              onClick={() => executeFromAlert(a)}
            >
              Execute {a.side}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function AlertToasts() {
  const { toasts, dismissToast, executeFromAlert } = useTrading();
  const { plan } = useAuth();
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{t.title}</strong>
            <button className="nav-btn" onClick={() => dismissToast(t.id)}>
              ×
            </button>
          </div>
          <p className="muted" style={{ margin: "6px 0", fontSize: 13 }}>
            {t.message}
          </p>
          {plan.execute && t.actionable && (
            <button
              className={`btn btn-sm ${t.side === "buy" ? "btn-buy" : "btn-sell"}`}
              onClick={() => {
                executeFromAlert(t);
                dismissToast(t.id);
              }}
            >
              Open position
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
