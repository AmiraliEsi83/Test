import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    try {
      signup({ name, email, password });
      nav("/pricing");
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <span className="kicker">Create seat</span>
        <h1>Open your HARSI desk</h1>
        <p className="muted">Starts on Scout. Upgrade to unlock live alerts and broker routing.</p>
        {err && <div className="error">{err}</div>}
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            minLength={6}
            required
          />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} type="submit">
          Create account
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          Already have a seat? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
