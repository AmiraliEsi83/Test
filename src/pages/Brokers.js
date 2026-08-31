import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTrading } from "../context/TradingContext";
import { BROKER_CATALOG } from "../lib/brokers";
import BrokerModal from "../components/trading/BrokerModal";

export default function Brokers() {
  const { plan } = useAuth();
  const { brokers, connectBroker, disconnectBroker, activeBrokerId, setActiveBrokerId } =
    useTrading();
  const [modal, setModal] = useState(null);

  const onConnect = (payload) => {
    if (!plan.execute) return;
    const liveCount = brokers.filter((b) => b.type !== "paper").length;
    if (payload.type !== "paper" && liveCount >= plan.brokers) {
      alert("Upgrade your seat to attach more live brokers.");
      return;
    }
    connectBroker(payload);
    setModal(null);
  };

  return (
    <div className="page section">
      <div className="section-head">
        <div>
          <h2>Brokers</h2>
          <p>
            Connect a venue, then open and close from the terminal or from an
            alert. Paper desk is always on.
          </p>
        </div>
        {!plan.execute && (
          <Link to="/pricing" className="btn btn-primary">
            Subscribe to route orders
          </Link>
        )}
      </div>

      <h3 style={{ margin: "8px 0 12px" }}>Connected</h3>
      <div className="broker-grid">
        {brokers.map((b) => (
          <article className="card" key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{b.name}</strong>
              <span className="badge badge-teal">{b.status}</span>
            </div>
            <p className="mono muted">{b.accountId}</p>
            <p>
              {b.currency} {Number(b.balance).toLocaleString()} · {b.leverage}x
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveBrokerId(b.id)}
              >
                {activeBrokerId === b.id ? "Active ticket" : "Use in ticket"}
              </button>
              {b.type !== "paper" && (
                <button className="btn btn-ghost btn-sm" onClick={() => disconnectBroker(b.id)}>
                  Disconnect
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <h3 style={{ margin: "28px 0 12px" }}>Add a venue</h3>
      <div className="broker-grid">
        {BROKER_CATALOG.map((b) => (
          <article className="card" key={b.type}>
            <strong>{b.name}</strong>
            <p className="muted">{b.blurb}</p>
            <button
              className="btn btn-primary btn-sm"
              disabled={!plan.execute || b.type === "paper"}
              onClick={() => setModal(b.type)}
            >
              {b.type === "paper" ? "Always on" : "Connect"}
            </button>
          </article>
        ))}
      </div>
      {modal && (
        <BrokerModal type={modal} onClose={() => setModal(null)} onConnect={onConnect} />
      )}
    </div>
  );
}
