"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/components/api";

function Form() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    try {
      await api("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    }
  }
  return (
    <div className="auth">
      <section className="auth-copy"><h1>Choose a new password.</h1></section>
      <form className="auth-form stack" onSubmit={submit}>
        {error ? <div className="banner err">{error}</div> : null}
        {!token ? <div className="banner err">This page needs a reset token.</div> : null}
        <label className="field"><span>New password</span><input name="password" type="password" minLength={8} required /></label>
        <button className="btn primary" type="submit">Update password</button>
        <Link href="/login">Sign in</Link>
      </form>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><Form /></Suspense>;
}
