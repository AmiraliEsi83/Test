"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PublicNav } from "@/components/PublicNav";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
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
              await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
              router.push("/dashboard");
            } catch (ex) {
              setErr((ex as Error).message);
            }
          }}
        >
          <h2>Create account</h2>
          <p className="muted">New accounts start on Free: chart, watchlist, delayed signals, paper trading.</p>
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          <label htmlFor="email">Email</label>
          <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} type="submit">
            Create account
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            Already registered? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
