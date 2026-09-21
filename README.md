# HARSI AI Trading Platform

Session terminal for research signals, paper execution, and broker adapters.

HARSI is **not** a broker and **not** investment advice. Strategy outputs are research/trading signals. They do not guarantee fills or returns.

---

## Important: this is a separate product from the portfolio

This codebase was extracted from work that briefly overlaid `AmiraliEsi83/Test` (the personal portfolio). **Do not merge this branch into `main` of Test.**

The original portfolio remains on:

- https://github.com/AmiraliEsi83/Test (`main`)
- https://amiraliesi83.github.io/Test/

This platform should live in its own GitHub repository:

```text
https://github.com/AmiraliEsi83/harsi-trading
```

GitHub Pages URL **if** you ever published a static snapshot (not recommended for this stack):

```text
https://amiraliesi83.github.io/harsi-trading/
```

The app is a **full-stack** Next.js + API + SQLite/Postgres system. GitHub Pages cannot host authentication, Prisma, or broker adapters. Prefer Vercel (web) + Railway/Render (API + database).

The GitHub App token used to develop this change can only push to `AmiraliEsi83/Test`. Creating `AmiraliEsi83/harsi-trading` requires your account. Exact commands: [docs/EXTRACT_TO_NEW_REPO.md](docs/EXTRACT_TO_NEW_REPO.md).

---

## What it does

A user can:

1. Create an account and sign in (httpOnly session cookie)
2. Choose Free / Trader / Pro (backend-enforced)
3. Open a trading terminal with a live-looking chart
4. Watch EUR/USD, GBP/USD, USD/JPY, XAU/USD, BTC/USD, ETH/USD, SPY, QQQ
5. Receive **London HARSI**, **Pulse Confluence**, and **Breakout + Trend** signals
6. See **why** a signal fired (condition checklist)
7. Paper-trade (market / limit / stop, SL/TP, partial close)
8. Inspect positions, orders, history, analytics
9. Backtest on simulated history (bar-close, no look-ahead)
10. Configure alerts, risk, and automation
11. Connect OANDA or Alpaca **only if credentials work** — otherwise **NOT CONNECTED**
12. Switch clearly between **PAPER** and **LIVE** (live never silently arms)

### London HARSI (configurable)

Around London session open (default T-15):

- First HARSI print in **−15 to −30** → **BUY** alert
- First HARSI print in **+15 to +30** → **SELL** alert

HARSI is the distance of last price from the Asian session midpoint, in pips. Thresholds, window, cooldown, max signals, symbols, and weekdays are stored as strategy config — not hardcoded UI logic.

### Pulse Confluence

EMA 9/21, RSI, MACD, ATR expansion, trend filter. Every signal lists pass/fail with values. There is no mysterious “AI confidence”.

### Breakout + Trend

Higher-timeframe EMA 50, previous-session high/low break, ATR expansion, volume confirmation. Research/demo module.

---

## Architecture

```
apps/web          Next.js 15 UI (rewrites /api → API)
apps/api          Fastify API, Prisma, strategy runtime, SSE
packages/engine   Indicators, strategies, risk, paper broker, backtest, adapters
packages/shared   Instruments, plans, formatting

Strategy → Signal → Risk Manager → Order Manager → Broker Adapter
MarketDataProvider is separate from BrokerAdapter.
```

Secrets never go in frontend JS, localStorage, or git.

| Layer | Implementation |
| --- | --- |
| Database | Prisma + SQLite locally (`apps/api/prisma/dev.db`). Postgres via `DATABASE_URL` in production. |
| Auth | bcrypt password hashes, JWT in httpOnly cookie, 7-day expiry |
| Paper broker | Fully implemented (spread, slippage, commission) |
| OANDA / Alpaca | Real adapters — connect() must succeed |
| IBKR / MT5 | Placeholders → **NOT CONNECTED** |
| Market data | Simulated FX (labeled **SIMULATED**). Public Binance klines for BTC/ETH (**PUBLIC FEED**) when reachable |
| Calendar | Empty unless `FINNHUB_API_KEY` is set — events are not fabricated |
| Billing | Stripe-shaped; without keys, plan changes are labeled **SIMULATED** |

---

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Public landing |
| `/login` `/signup` `/forgot-password` `/pricing` | Auth & plans |
| `/dashboard` | Portfolio + chart + watchlist + sessions |
| `/terminal` | Chart + paper ticket |
| `/strategies` | Module cards, enable/disable, config |
| `/signals` `/signals/[id]` | Blotter + condition detail |
| `/positions` `/orders` `/history` | Blotter |
| `/analytics` | PAPER vs LIVE stats (Trader) |
| `/backtest` | Saved runs (Trader) |
| `/brokers` | Adapter cards |
| `/automation` | Alerts / paper auto / live auto + STOP ALL |
| `/alerts` `/calendar` `/activity` `/settings` | Ops |

---

## Local setup

```bash
cp .env.example apps/api/.env   # already contains DEMO_MODE=true
npm install
npm run db:push
npm run db:seed
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

### Demo accounts (only when `DEMO_MODE=true`)

| Email | Password | Plan |
| --- | --- | --- |
| trader@harsi.ai | harsi123 | Trader |
| pro@harsi.ai | harsi123 | Pro |
| free@harsi.ai | harsi123 | Free |

These seats are **not** used in production unless you set `DEMO_MODE=true`.

### Scripts

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

---

## Environment variables

See `.env.example`. Never commit `.env`.

Required for a real deployment:

- `JWT_SECRET` — long random string
- `DATABASE_URL` — `file:./dev.db` or Postgres URL
- `WEB_ORIGIN` — frontend origin for CORS
- `NEXT_PUBLIC_API_URL` — public API URL for the web app

Optional:

- `OANDA_API_KEY` / `OANDA_ACCOUNT_ID` — server market-data vendor
- `STRIPE_SECRET_KEY` + price IDs — real checkout
- `FINNHUB_API_KEY` — economic calendar
- `SMTP_URL` — password-reset email

---

## Deployment

1. Create `AmiraliEsi83/harsi-trading` (see `docs/EXTRACT_TO_NEW_REPO.md`).
2. Provision Postgres (Neon, Railway, Render, Supabase).
3. Deploy **API** as a long-running Node process (Railway / Render / Fly) — the strategy engine is an interval loop, not a serverless function.
4. Deploy **web** on Vercel with `NEXT_PUBLIC_API_URL` pointing at the API.
5. Set `DEMO_MODE=false` in production.
6. Run `prisma db push` or migrate against production Postgres (switch `provider` in `schema.prisma` to `postgresql`).

Configs included:

- `Dockerfile`
- `render.yaml`
- `railway.toml`
- `apps/web/vercel.json`

This environment cannot create the GitHub repo or attach Vercel/Railway credentials. After you create the repo and connect a host, the production URL will be whatever that host assigns (for example `https://harsi-trading.vercel.app`).

---

## Tests

- Engine: London HARSI, Pulse, risk manager, paper broker, backtest, analytics (`packages/engine`)
- API: signup, login, dashboard, paper order, position close, history, subscription gate, live order refusal (`apps/api`)
- UI unit: formatting (`apps/web`)
- E2E: landing → sign in (`apps/web/e2e`) with Playwright against a running app

---

## Limitations

- FX candles are **SIMULATED** without a vendor key.
- Paper fills are **PAPER**, not brokerage fills.
- Live brokers stay **NOT CONNECTED** until `connect()` succeeds.
- IBKR and MT5 need infrastructure this repo does not run.
- Stripe checkout is **SIMULATED** without keys.
- Economic calendar is empty without a provider key.
- Webhooks / Telegram are architecture-only.
- SQLite is for local/demo; use Postgres in production.

---

## License / use

Research software. You are responsible for venue agreements, risk, and compliance in your jurisdiction.
