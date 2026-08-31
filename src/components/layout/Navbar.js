import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout, plan } = useAuth();
  const nav = useNavigate();

  return (
    <header className="nav">
      <Link to="/" className="brand">
        <span className="brand-mark">H</span>
        HARSI
      </Link>
      <nav className="nav-links">
        {user ? (
          <>
            <NavLink to="/dashboard">Overview</NavLink>
            <NavLink to="/terminal">Terminal</NavLink>
            <NavLink to="/algorithms">Algorithms</NavLink>
            <NavLink to="/alerts">Alerts</NavLink>
            <NavLink to="/brokers">Brokers</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/algorithms">Algorithms</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
          </>
        )}
      </nav>
      <div className="nav-cta">
        {user ? (
          <>
            <Link to="/account" className="nav-btn">
              {user.name} · {plan.name}
            </Link>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                logout();
                nav("/");
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link to="/signup" className="btn btn-primary btn-sm">
              Start desk
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
