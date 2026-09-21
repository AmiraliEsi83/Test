import Link from "next/link";
import { PLANS, INSTRUMENT_LIST } from "@harsi/shared";
import { STRATEGIES } from "@harsi/strategies";
import { BROKER_CATALOG } from "@harsi/broker-adapters";
import { Preview } from "@/components/Preview";

export default function LandingPage() {
  return (
    <div className="marketing">
      <header className="m-nav">
        <Link href="/" className="brand">HARSI <small>RESEARCH</small></Link>
        <nav>
          <a href="#strategies">Strategies</a>
          <a href="#pricing">Pricing</a>
          <Link href="/login">Sign in</Link>
          <Link className="btn primary" href="/signup">Create account</Link>
        </nav>
      </header>
      <section className="hero" data-testid="landing-hero">
        <div>
          <p className="eyebrow">Session terminal</p>
          <h1>The London print, explained before the order.</h1>
          <p className="lede">HARSI measures price against the Asian range. Pulse and Breakout publish the indicator checks that passed. Paper fills stay on the desk until a broker is actually connected.</p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link className="btn primary" href="/signup">Open a desk</Link>
            <Link className="btn" href="/login">Sign in</Link>
          </div>
          <p className="disclaimer">Signals are research output. They are not advice and they do not guarantee a result.</p>
        </div>
        <Preview />
      </section>
      <section className="section" id="strategies">
        <h2>Three rules, no mystery score.</h2>
        <div className="grid-3">
          {STRATEGIES.map((strategy) => (
            <article key={strategy.id} className="card pad">
              <h3>{strategy.name}</h3>
              <p className="muted">{strategy.summary}</p>
              <p className="faint">{strategy.disclaimer}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Markets on the desk</h2>
        <div className="row">{INSTRUMENT_LIST.map((item) => <span key={item.symbol} className="badge">{item.label}</span>)}</div>
        <p className="muted">FX, metals, and equities use a simulated tape in this build. BTC and ETH can read Binance public klines when that host answers. The chart labels the source.</p>
      </section>
      <section className="section">
        <h2>Brokers</h2>
        <div className="grid-3">
          {BROKER_CATALOG.map((broker) => (
            <article key={broker.id} className="card pad">
              <h3>{broker.name}</h3>
              <p className="muted">{broker.blurb}</p>
              <span className="badge">{broker.kind === "paper" ? "Working" : broker.kind === "placeholder" ? "Not connected" : "Adapter"}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="section" id="pricing">
        <h2>Plans</h2>
        <div className="grid-3">
          {Object.values(PLANS).map((plan) => (
            <article key={plan.id} className="card pad">
              <h3>{plan.name}</h3>
              <div className="price">{plan.priceMonthly === 0 ? "$0" : `$${plan.priceMonthly}`}<span className="faint"> /mo</span></div>
              <p className="muted">{plan.blurb}</p>
              <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </article>
          ))}
        </div>
        <p className="disclaimer">Local demo mode can switch plans without Stripe and labels the change as simulated. Production checkout stays disabled until Stripe keys are set.</p>
      </section>
      <section className="section grid-2">
        <article className="card pad">
          <h2>Security</h2>
          <p className="muted">Passwords are hashed. Sessions sit in an httpOnly cookie. Broker secrets are encrypted on the server and are not written to the browser. Live orders are refused when a broker is not connected.</p>
        </article>
        <article className="card pad faq">
          <h2>FAQ</h2>
          <details open><summary>Does a signal mean I should trade?</summary><p>No. It means the published rules were true on closed bars.</p></details>
          <details><summary>Is the chart my broker&apos;s price?</summary><p>Only when a source label says so. Otherwise it is simulated.</p></details>
          <details><summary>Can automation send a live order by itself?</summary><p>Only after you type ENABLE LIVE, your plan allows it, and a broker sync has a balance. Otherwise the order is not sent.</p></details>
        </article>
      </section>
    </div>
  );
}
