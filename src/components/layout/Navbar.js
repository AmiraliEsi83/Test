import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTrading } from "../../context/TradingContext";

export default function Navbar() {
  const { user, logout, plan } = useAuth();
  const { mode, status } = useTrading();
  const nav = useNavigate();
  const dot = status?.engine === "stopped" ? "#f07178" : "#3dcfb0";

  return (
    <header className="nav">
      <Link to="/" className="brand">
        <span className="brand-mark">H</span>
        HARSI
        {user && <span className={`badge ${mode === "live" ? "badge-sell" : "badge-teal"}`} style={{ marginLeft: 8 }}>{mode.toUpperCase()}</span>}
      </Link>
      <nav className="nav-links">
        {user ? (
          <>
            <NavLink to="/dashboard">Overview</NavLink>
            <NavLink to="/terminal">Terminal</NavLink>
            <NavLink to="/strategies">Strategies</NavLink>
            <NavLink to="/signals">Signals</NavLink>
            <NavLink to="/positions">Positions</NavLink>
            <NavLink to="/analytics">Analytics</NavLink>
            <NavLink to="/brokers">Brokers</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/algorithms">Strategies</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
          </>
        )}
      </nav>
      <div className="nav-cta">
        {user ? (
          <>
            <span className="faint mono" style={{ fontSize: 11 }}><span className="dot" style={{ background: dot }} /> {status?.marketData?.toUpperCase()}</span>
            <Link to="/settings" className="nav-btn">{user.name} · {plan.name}</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => { logout(); nav("/"); }}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Start desk</Link>
          </>
        )}
      </div>
    </header>
  );
}
