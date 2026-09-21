"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/api";

export default function ForgotPage() {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await api<{ message: string; devResetUrl?: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email: form.get("email") }) });
    setMessage(result.message);
    setLink(result.devResetUrl || "");
  }

  return (
    <div className="auth">
      <section className="auth-copy"><h1>Reset access.</h1><p className="lede">Without SMTP, production cannot email the link. Demo mode can show it on this page.</p></section>
      <form className="auth-form stack" onSubmit={submit}>
        <label className="field"><span>Email</span><input name="email" type="email" required /></label>
        <button className="btn primary" type="submit">Create reset token</button>
        {message ? <div className="banner">{message}</div> : null}
        {link ? <div className="banner ok">Demo only: <Link href={link}>open reset link</Link></div> : null}
        <Link href="/login">Back to sign in</Link>
      </form>
    </div>
  );
}
