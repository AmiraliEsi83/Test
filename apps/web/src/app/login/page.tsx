"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PublicNav } from "@/components/PublicNav";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [demo, setDemo] = useState<any>(null);
  useEffect(() => {
    api<{ demoMode: boolean; demoAccounts: any[] }>("/api/meta").then(setDemo).catch(() => null);
  }, []);
  return (
    <div>
      <PublicNav />
      <div className="auth-wrap">
        <form
          className="auth-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            try {
              await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
              router.push("/dashboard");
            } catch (ex) {
              setErr((ex as Error).message);
            }
          }}
        >
          <h2>Sign in</h2>
          <p className="muted">Session cookies are httpOnly. Demo seats exist only when DEMO_MODE is on.</p>
          <label htmlFor="email">Email</label>
          <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} type="submit">
            Continue
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            <Link href="/forgot-password">Forgot password</Link> · <Link href="/signup">Create account</Link>
          </p>
          {demo?.demoMode && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="badge badge-gold">DEMO</div>
              <p className="muted" style={{ fontSize: 13 }}>
                trader@harsi.ai / harsi123 (Trader)
                <br />
                pro@harsi.ai / harsi123 (Pro)
                <br />
                free@harsi.ai / harsi123 (Free)
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
