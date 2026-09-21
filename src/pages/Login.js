import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEMO_MODE = (process.env.REACT_APP_DEMO_MODE || "true") !== "false";

export default function Login() {
  const { login, forgotPassword } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("trader@harsi.ai");
  const [password, setPassword] = useState("harsi123");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

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
        {info && <div className="badge badge-teal" style={{ marginBottom: 8 }}>{info}</div>}
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} type="submit">
          Enter terminal
        </button>
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8 }} onClick={async () => { const r = await forgotPassword(); setInfo(r.message); }}>
          Forgot password?
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          New here? <Link to="/signup">Create a Free seat</Link>
        </p>
        {DEMO_MODE && (
          <div className="demo-hint">
            Demo mode (REACT_APP_DEMO_MODE=true): Trader trader@harsi.ai / harsi123
            <br />
            Pro: desk@harsi.ai / harsi123 — disabled when demo mode is off.
          </div>
        )}
      </form>
    </div>
  );
}
