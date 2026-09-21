"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/components/api";

function Form() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      router.push(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-copy">
        <p className="eyebrow">HARSI</p>
        <h1>Sign in to the desk.</h1>
        <p className="lede">Paper positions, signals, and broker status stay on the server for this account.</p>
      </section>
      <form className="auth-form stack" onSubmit={submit} data-testid="login-form">
        <h2>Sign in</h2>
        {error ? <div className="banner err">{error}</div> : null}
        <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="username" /></label>
        <label className="field"><span>Password</span><input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="btn primary" type="submit" disabled={pending}>{pending ? "Signing in" : "Sign in"}</button>
        <Link href="/forgot-password">Forgot password</Link>
        <Link href="/signup">Create an account</Link>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><Form /></Suspense>;
}
