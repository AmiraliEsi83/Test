"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

interface ShellUser {
  name: string;
  email: string;
  timezone: string;
  plan: string;
  planSource: string;
  executionMode: "paper" | "live";
  liveArmed: boolean;
}

const ToastContext = createContext<(text: string, tone?: "ok" | "err") => void>(() => {});
export function useToast() {
  return useContext(ToastContext);
}

const NAV = [
  ["/dashboard", "Dashboard"],
  ["/strategies", "Strategies"],
  ["/signals", "Signals"],
  ["/positions", "Positions"],
  ["/orders", "Orders"],
  ["/history", "History"],
  ["/analytics", "Analytics"],
  ["/backtest", "Backtest"],
  ["/brokers", "Brokers"],
  ["/automation", "Automation"],
  ["/activity", "Activity"],
  ["/settings", "Settings"],
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "ok" | "err" }[]>([]);
  const [health, setHealth] = useState<{ marketData: { status: string; detail: string }; stream: { status: string; detail: string }; strategyEngine: { status: string; detail: string }; broker: { status: string; detail: string } } | null>(null);
  const [clock, setClock] = useState("");
  const [liveOpen, setLiveOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const toast = (text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, text, tone }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
  };

  useEffect(() => {
    const tick = () => setClock(new Intl.DateTimeFormat("en-GB", { timeZone: user.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    const healthTimer = setInterval(() => {
      api<NonNullable<typeof health>>("/api/health").then(setHealth).catch(() => setHealth(null));
    }, 8000);
    api<NonNullable<typeof health>>("/api/health").then(setHealth).catch(() => undefined);
    return () => {
      clearInterval(timer);
      clearInterval(healthTimer);
    };
  }, [user.timezone]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function setMode(mode: "paper" | "live") {
    try {
      await api("/api/mode", { method: "POST", body: JSON.stringify({ mode, confirmation: phrase }) });
      setLiveOpen(false);
      setPhrase("");
      toast(mode === "paper" ? "Execution is paper." : "Execution is live. Orders can leave this server.");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Mode was not changed.", "err");
    }
  }

  const dot = (status?: string) => (status === "ok" || status === "connected" || status === "binance-public" ? "ok" : status === "error" ? "bad" : "warn");

  return (
    <ToastContext.Provider value={toast}>
      <div className="shell">
        <header className="topbar">
          <Link href="/dashboard" className="brand">HARSI <small>TERMINAL</small></Link>
          <span className={`badge ${user.executionMode === "live" ? "live" : "paper"}`}>{user.executionMode}</span>
          <span className="badge">{user.plan}{user.planSource === "demo" ? " · simulated" : ""}</span>
          <span className="clock">{clock} {user.timezone}</span>
          <div className="top-meta">
            <div className="dots" title={health ? `${health.marketData.detail} ${health.stream.detail} ${health.strategyEngine.detail} ${health.broker.detail}` : "Waiting for status"}>
              <span><i className={`dot ${health ? "ok" : "warn"}`} /> <span className="dot-label">API</span></span>
              <span><i className={`dot ${dot(health?.marketData.status)}`} /> <span className="dot-label">Data</span></span>
              <span><i className={`dot ${health?.stream.status === "polling" ? "warn" : "bad"}`} /> <span className="dot-label">Feed</span></span>
              <span><i className={`dot ${dot(health?.strategyEngine.status)}`} /> <span className="dot-label">Engine</span></span>
              <span><i className={`dot ${dot(health?.broker.status)}`} /> <span className="dot-label">Broker</span></span>
            </div>
            <button className="btn" type="button" onClick={() => (user.executionMode === "live" ? setMode("paper") : setLiveOpen(true))}>{user.executionMode === "live" ? "Return to paper" : "Arm live mode"}</button>
            <span className="muted">{user.name}</span>
            <button className="btn" type="button" data-testid="logout" onClick={logout}>Log out</button>
          </div>
        </header>
        <aside className="nav">
          {NAV.map(([href, label]) => <Link key={href} href={href} className={path.startsWith(href) ? "active" : ""}>{label}</Link>)}
        </aside>
        <main className="main">
          {children}
          <p className="disclaimer">Research signals and paper fills are not brokerage statements and not a promise of profit. Live routing happens only after you connect a broker and confirm it.</p>
        </main>
      </div>
      {liveOpen ? (
        <div className="modal-back">
          <div className="card modal stack">
            <h2>Switch execution to live</h2>
            <p className="muted">This does not place an order. It allows later tickets and armed strategies to call a connected broker. Type ENABLE LIVE. If no broker is connected, the mode stays paper.</p>
            <input value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder="ENABLE LIVE" />
            <div className="row">
              <button className="btn danger" type="button" onClick={() => setMode("live")}>Confirm live mode</button>
              <button className="btn" type="button" onClick={() => setLiveOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="toasts">{toasts.map((item) => <div key={item.id} className={`toast ${item.tone === "err" ? "down" : ""}`}>{item.text}</div>)}</div>
    </ToastContext.Provider>
  );
}
