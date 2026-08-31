import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user, plan } = useAuth();
  return (
    <div className="page section">
      <h2>Account</h2>
      <div className="card" style={{ maxWidth: 520, marginTop: 16 }}>
        <p>
          <span className="faint">Name</span>
          <br />
          <strong>{user.name}</strong>
        </p>
        <p>
          <span className="faint">Email</span>
          <br />
          <strong>{user.email}</strong>
        </p>
        <p>
          <span className="faint">Seat</span>
          <br />
          <strong>{plan.name}</strong> · {plan.tagline}
        </p>
        <Link to="/pricing" className="btn btn-primary">
          Manage subscription
        </Link>
      </div>
    </div>
  );
}
