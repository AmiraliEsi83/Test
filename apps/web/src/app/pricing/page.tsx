"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PublicNav } from "@/components/PublicNav";

export default function PricingPage() {
  const [plans, setPlans] = useState<any>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api<{ plans: any }>("/api/meta").then((d) => setPlans(d.plans));
  }, []);
  const list = plans ? Object.values(plans) : [];
  return (
    <div>
      <PublicNav />
      <section className="section">
        <h1>Pricing</h1>
        <p className="muted">Authorization is enforced on the API. Checkout is SIMULATED unless Stripe keys are present.</p>
        <div className="grid-3" style={{ marginTop: 24 }}>
          {list.map((p: any) => (
            <article className="card" key={p.id}>
              {p.featured && <div className="badge badge-gold">Most used</div>}
              <h3>{p.name}</h3>
              <div className="price">${p.price}</div>
              <p>{p.tagline}</p>
              <ul className="muted">
                {p.features.map((f: string) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const res = await api<{ simulated?: boolean; note?: string }>("/api/billing/subscribe", {
                      method: "POST",
                      body: JSON.stringify({ plan: p.id }),
                    });
                    setMsg(`${res.simulated ? "SIMULATED · " : ""}${res.note || "Updated"}`);
                  } catch (e) {
                    setMsg((e as Error).message + " — sign in first.");
                  }
                }}
              >
                Choose {p.name}
              </button>
            </article>
          ))}
        </div>
        {msg && <p className="muted">{msg}</p>}
        <p style={{ marginTop: 24 }}>
          <Link href="/signup">Create a Free account</Link>
        </p>
      </section>
    </div>
  );
}
