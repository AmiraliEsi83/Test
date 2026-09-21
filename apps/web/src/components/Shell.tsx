"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const LINKS = [
  ["Dashboard", "/dashboard"],
  ["Terminal", "/terminal"],
  ["Strategies", "/strategies"],
  ["Signals", "/signals"],
  ["Positions", "/positions"],
  ["Orders", "/orders"],
  ["History", "/history"],
  ["Analytics", "/analytics"],
  ["Backtest", "/backtest"],
  ["Brokers", "/brokers"],
  ["Automation", "/automation"],
  ["Alerts", "/alerts"],
  ["Calendar", "/calendar"],
  ["Activity", "/activity"],
  ["Settings", "/settings"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [clock, setClock] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ user: any }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => router.push("/login"));
    api("/api/status").then(setStatus).catch(() => null);
    api("/api/dashboard").then(setDash).catch(() => null);
    api("/api/sessions/clock").then(setClock).catch(() => null);
    const t = setInterval(() => {
      api("/api/sessions/clock").then(setClock).catch(() => null);
      api("/api/dashboard").then(setDash).catch(() => null);
      api("/api/status").then(setStatus).catch(() => null);
    }, 4000);
    return () => clearInterval(t);
  }, [router]);

  if (!user) {
    return (
      <div className="main">
        <div className="skel" style={{ width: 240, height: 18 }} />
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/dashboard" className="brand" style={{ padding: "8px 10px 16px" }}>
          <span className="brand-mark">H</span> HARSI
        </Link>
        {LINKS.map(([label, href]) => (
          <Link key={href} href={href} className={path === href || path.startsWith(href + "/") ? "active" : ""}>
            {label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="linkish"
          onClick={async () => {
            await api("/api/auth/logout", { method: "POST", body: "{}" });
            router.push("/");
          }}
        >
          Log out
        </button>
      </aside>
      <div>
        <header className="topbar">
          <div className="top-metrics">
            <span>
              {user.name} · <b>{user.planMeta?.name || user.plan}</b>
            </span>
            <span>
              Mode <b className="badge badge-gold">PAPER</b>
            </span>
            <span>
              API <i className={`status-dot ${status?.api === "ok" ? "ok" : "bad"}`} />
            </span>
            <span>
              Data <i className={`status-dot ${status?.marketData === "ok" ? "ok" : status?.marketData === "idle" ? "idle" : "warn"}`} /> {status?.marketData}
            </span>
            <span>
              Engine <i className={`status-dot ${status?.strategyEngine === "ok" ? "ok" : "idle"}`} />
            </span>
            <span>
              {clock?.sessions?.find((s: any) => s.key === "london")?.open ? "London open" : "London closed"}
            </span>
            <span>{user.timezone}</span>
          </div>
          <div className="top-metrics">
            <span>
              Equity <b>{dash ? `$${Number(dash.equity).toFixed(0)}` : "—"}</b>
            </span>
            <span>
              Today <b className={dash?.todayPnl >= 0 ? "up" : "down"}>{dash ? `$${Number(dash.todayPnl).toFixed(0)}` : "—"}</b>
            </span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST", body: "{}" });
                router.push("/");
              }}
            >
              Log out
            </button>
          </div>
        </header>
        <div className="main">
          {err && <div className="err">{err}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

export function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b className={tone || ""}>{value}</b>
    </div>
  );
}
