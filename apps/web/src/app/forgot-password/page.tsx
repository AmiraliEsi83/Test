"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { PublicNav } from "@/components/PublicNav";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div>
      <PublicNav />
      <div className="auth-wrap">
        <form
          className="auth-card"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await api<{ note?: string; demoToken?: string }>("/api/auth/forgot", {
              method: "POST",
              body: JSON.stringify({ email }),
            });
            setMsg([res.note, res.demoToken ? `DEMO token: ${res.demoToken}` : ""].filter(Boolean).join(" "));
          }}
        >
          <h2>Reset password</h2>
          <p className="muted">Architecture is in place. Email delivery requires SMTP_URL. DEMO_MODE returns the token instead of sending mail.</p>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} type="submit">
            Request reset
          </button>
          {msg && <p className="muted">{msg}</p>}
        </form>
      </div>
    </div>
  );
}
