import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { AlertList } from "../components/alerts/AlertList";

export default function Alerts() {
  const { plan } = useAuth();
  const { settings, setSettings, requestNotifications } = useTrading();

  return (
    <div className="page section">
      <div className="section-head">
        <div>
          <h2>Open & close alerts</h2>
          <p>
            Subscribed seats get Harsi, Pulse, fill, stop, and take-profit
            alerts. Scout sees the lock, not the print.
          </p>
        </div>
        {!plan.alerts && (
          <Link to="/pricing" className="btn btn-primary">
            Unlock Operator
          </Link>
        )}
      </div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <label className="card">
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => setSettings({ ...settings, sound: e.target.checked })}
          />{" "}
          Sound
        </label>
        <label className="card">
          <input
            type="checkbox"
            checked={settings.desktop}
            onChange={(e) => {
              setSettings({ ...settings, desktop: e.target.checked });
              if (e.target.checked) requestNotifications();
            }}
          />{" "}
          Desktop notifications
        </label>
        <label className="card">
          <input
            type="checkbox"
            checked={settings.forceLondonWindow}
            onChange={(e) =>
              setSettings({ ...settings, forceLondonWindow: e.target.checked })
            }
          />{" "}
          Keep Harsi T-15 armed (demo)
        </label>
      </div>
      <div className="card">
        <AlertList />
      </div>
    </div>
  );
}
