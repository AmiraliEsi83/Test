import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../lib/storage";

export default function Pricing() {
  const { user, plan, subscribe } = useAuth();
  const nav = useNavigate();
  const [checkout, setCheckout] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = (id) => {
    if (!user) {
      nav("/signup");
      return;
    }
    if (id === "free") {
      subscribe("free");
      nav("/dashboard");
      return;
    }
    setCheckout(id);
  };

  const pay = (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      subscribe(checkout);
      setBusy(false);
      nav("/dashboard");
    }, 700);
  };

  return (
    <div className="page section">
      <div className="section-head">
        <div>
          <h2>Seats that actually alert.</h2>
          <p>
            Free watches the tape. Paid seats get opening and closing position
            alerts, broker routing, and Pulse recommendations.
          </p>
        </div>
      </div>
      <div className="pricing-grid">
        {Object.values(PLANS).map((p) => (
          <article key={p.id} className={`price-card ${p.featured ? "featured" : ""}`}>
            {p.featured && <span className="badge badge-teal">Most desks</span>}
            <h3>{p.name}</h3>
            <div className="amount">
              ${p.price}
              <span style={{ fontSize: 16, color: "var(--muted)" }}>/mo</span>
            </div>
            <p className="muted">{p.tagline}</p>
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className={`btn ${p.featured ? "btn-primary" : "btn-ghost"}`}
              onClick={() => choose(p.id)}
              disabled={plan?.id === p.id}
            >
              {plan?.id === p.id ? "Current seat" : p.price === 0 ? "Continue free" : "Subscribe"}
            </button>
          </article>
        ))}
      </div>

      {checkout && (
        <div className="modal-back" onClick={() => setCheckout(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={pay}>
            <h3>Activate {PLANS[checkout].name}</h3>
            <p className="muted">
              Demo checkout — no charge. This unlocks live Harsi / Pulse alerts
              and broker execution on this browser seat.
            </p>
            <div className="field">
              <label>Cardholder</label>
              <input defaultValue={user?.name} required />
            </div>
            <div className="field">
              <label>Card number</label>
              <input defaultValue="4242 4242 4242 4242" required />
            </div>
            <div className="lots-row">
              <div className="field">
                <label>Expiry</label>
                <input defaultValue="12 / 28" required />
              </div>
              <div className="field">
                <label>CVC</label>
                <input defaultValue="123" required />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Confirming…" : `Pay $${PLANS[checkout].price} and activate`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
