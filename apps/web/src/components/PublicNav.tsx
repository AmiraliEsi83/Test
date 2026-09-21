"use client";
import Link from "next/link";

export function PublicNav() {
  return (
    <nav className="public-nav">
      <Link href="/" className="brand">
        <span className="brand-mark">H</span> HARSI
      </Link>
      <div className="nav-links">
        <Link href="/#strategies">Strategies</Link>
        <Link href="/#markets">Markets</Link>
        <Link href="/#brokers">Brokers</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/#security">Security</Link>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/login" className="btn btn-ghost btn-sm">
          Sign in
        </Link>
        <Link href="/signup" className="btn btn-primary btn-sm">
          Open an account
        </Link>
      </div>
    </nav>
  );
}
