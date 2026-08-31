import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("trader@harsi.ai");
  const [password, setPassword] = useState("harsi123");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    try {
      login(email, password);
      nav(loc.state?.from || "/dashboard", { replace: true });
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <span className="kicker">Member login</span>
        <h1>Sign in to the desk</h1>
        <p className="muted">Subscribed seats receive live open and close alerts.</p>
        {err && <div className="error">{err}</div>}
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
            required
          />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} type="submit">
          Enter terminal
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          New here? <Link to="/signup">Create a Scout seat</Link>
        </p>
        <div className="demo-hint">
          Operator demo: trader@harsi.ai / harsi123
          <br />
          Desk demo: desk@harsi.ai / harsi123
        </div>
      </form>
    </div>
  );
}
