# HARSI

HARSI is a research terminal for session signals and paper execution. It explains why a signal printed, lets a subscribed account paper-trade that idea, and keeps live broker routing behind server-side adapters.

Strategy output is a research signal. It is not financial advice and it is not a promise of profit.

This project is meant to live in its own repository, `AmiraliEsi83/harsi-ai-trading`, separate from the portfolio site. The automation token used while building it could not create that GitHub repository. Move it with the commands in [docs/deployment.md](docs/deployment.md).

## Architecture

```text
apps/web                 Next.js UI and HTTP API
packages/shared          Instruments, sessions, plans
packages/market-data     Indicators, simulated tape, optional Binance public klines
packages/strategies      London HARSI, Pulse Confluence, Breakout + Trend
packages/trading-engine  Risk manager, paper ledger, backtests
packages/broker-adapters OANDA, Alpaca, IBKR probe, MT5 placeholder
```

Orders follow one path:

```text
Strategy → Signal → Risk manager → Order manager → Broker adapter
```

The paper adapter is a ledger in the database. Other adapters call the broker only after credentials are stored encrypted on the server. If a broker is not configured, the screen says so. The app does not invent a live fill.

## Strategies

- **London HARSI.** On an allowed weekday, during the London window (default 07:45–08:05 London), the first print between −30 and −15 can alert a buy. The first print between +15 and +30 can alert a sell. HARSI is the pip distance from price to the Asian midpoint.
- **Pulse Confluence.** A buy or sell only when EMA 9/21, RSI, MACD, ATR expansion, and the EMA 50 filter all pass. Each line is shown.
- **Breakout + Trend.** Higher-timeframe EMA trend, a close through the Asian high or low, ATR expansion, and volume above its 20-bar average.

Parameters for each strategy are stored per user and can be edited under Strategies.

## Plans

| Plan | What it unlocks |
| --- | --- |
| Free | Chart, watchlist, signals delayed 15 minutes, manual paper orders |
| Trader | Realtime signals, alerts, analytics, backtests, paper automation |
| Pro | Broker vault, live automation, webhooks |

Plan checks run in the API. Hiding a button is not the control. In `DEMO_MODE=true`, changing plan is labeled simulated and does not charge Stripe. With demo mode off, Stripe must be configured or the plan is left unchanged.

## Local setup

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:3000.

`npm run setup` creates `.env` (gitignored), runs migrations, and seeds a demo desk when `DEMO_MODE=true`.

Demo login, local only:

- Email: `demo@harsi.local`
- Password: `harsi-demo-only` (or `SEED_DEMO_PASSWORD`)
- Plan: simulated Pro

There is no password baked into the client. Signup creates a real Free account.

## Environment

See [.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file locally. Use PostgreSQL in production after switching the Prisma provider. |
| `AUTH_SECRET` | Signs the httpOnly session cookie. |
| `ENCRYPTION_KEY` | Encrypts broker credentials at rest. Without it, secrets are refused. |
| `DEMO_MODE` | Allows simulated plan changes and shows reset links. Turn off in production. |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_TRADER`, `STRIPE_PRICE_PRO` | Optional checkout. |
| `SMTP_URL` | Optional. Email alerts stay in-app until this exists. |
| `CALENDAR_PROVIDER` | Optional. No events are fabricated when it is empty. |
| `OANDA_*`, `ALPACA_*` | Optional server-side broker credentials. The UI form is preferred. |

## Database

Prisma schema: `prisma/schema.prisma`. Migrations: `prisma/migrations`.

Tables cover users, subscriptions, strategy configs, signals, alerts, paper accounts, orders, positions, trades, broker connections, backtests, and audit logs.

```bash
npm run db:migrate
npm run db:seed
```

## Paper trading

Market, limit, and stop orders, stops, targets, partial closes, and close-all. Fills include spread, slippage, and commission assumptions. Positions survive a refresh. The ticket follows the server execution mode, not a flag sent by the browser.

## Broker adapters

| Broker | Behavior |
| --- | --- |
| Paper | Full local ledger |
| OANDA | Practice or live REST for account, orders, and closes when a token is saved |
| Alpaca | Account and SPY/QQQ orders when keys are saved |
| Interactive Brokers | Gateway reachability only. This build does not submit IBKR orders |
| MetaTrader 5 | Placeholder. Not connected |

Binance and FXCM are not offered. The previous prototype did not implement them.

## Market data

FX, metals, and equities use a deterministic simulated tape and are labeled **Simulated**. BTC and ETH try Binance public klines and fall back to the simulated tape if that request fails. The chart shows which one it used.

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm test` covers indicators, HARSI, Pulse, risk blocks, paper fills, the conservative stop-before-target rule, and a signup → paper order → close → analytics path.

## Deployment

The app is a Node server with a database. GitHub Pages is not a fit. See [docs/deployment.md](docs/deployment.md) for Docker, Railway or Fly, and the remaining steps that need your hosting and Stripe credentials.

## Limitations

- No live economic calendar feed is connected.
- Email is stored as an in-app alert until SMTP is configured.
- IBKR and MT5 do not route orders.
- Live automation will not send an order until the broker has been synced and a balance is known.
- Backtests use the simulated tape and assume a stop fills before a target when both are touched in one bar.
- SQLite is the zero-dependency database. Production should move to PostgreSQL before more than one server runs.
