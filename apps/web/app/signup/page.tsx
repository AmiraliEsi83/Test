"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/api";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }) });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-copy">
        <p className="eyebrow">Free desk</p>
        <h1>Start on paper.</h1>
        <p className="lede">New accounts open on the Free plan with a 100,000 paper balance. The balance is simulated.</p>
      </section>
      <form className="auth-form stack" onSubmit={submit} data-testid="signup-form">
        <h2>Create account</h2>
        {error ? <div className="banner err">{error}</div> : null}
        <label className="field"><span>Name</span><input id="name" name="name" required minLength={2} /></label>
        <label className="field"><span>Email</span><input id="email" name="email" type="email" required /></label>
        <label className="field"><span>Password</span><input id="password" name="password" type="password" required minLength={8} /></label>
        <button className="btn primary" data-testid="signup-submit" type="submit" disabled={pending}>{pending ? "Creating" : "Create account"}</button>
        <Link href="/login">Already have an account</Link>
      </form>
    </div>
  );
}
