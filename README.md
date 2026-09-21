# HARSI AI Trading Platform

Professional AI-assisted trading terminal: live/demo charts, three explainable strategies,
paper trading with a real risk layer, broker adapter architecture, backtesting, analytics,
subscriptions and audit logging.

> **Research signals, not financial advice. No strategy guarantees returns. Paper fills are
> labeled `PAPER` / `SIMULATED`. Unconfigured brokers show `NOT CONNECTED` — fills are never faked.**

**New repository:** this codebase is HARSI-only and independently installable. To move it to a
standalone repo (the portfolio in `AmiraliEsi83/Test` is left untouched on `main`):

```bash
# from a clean checkout of this branch
git remote add harsi https://github.com/AmiraliEsi83/harsi-trading.git
git push -u harsi cursor/harsi-trading-platform-ba68:main
# then set the default branch + Vercel project to harsi-trading
```

Deployed frontend target: **Vercel** (see `vercel.json`). Backend/database stages are documented
below; until keys exist the app runs fully client-side with `localStorage` persistence.

## What is built

| Area | Route | Notes |
|---|---|---|
| Landing | `/` | Hero, terminal preview, strategies, markets, brokers, pricing, FAQ, risk disclaimer |
| Auth | `/login` `/signup` | Demo seats in demo mode only; 7-day session expiry; forgot-password architecture |
| Overview | `/dashboard` | Equity, P/L, drawdown, watchlist, sessions, signals, PAPER/LIVE switch |
| Terminal | `/terminal` | ProChart (candles, EMA, RSI, volume, S/R, sessions, H/P/B markers, SL/TP), timeframes, zoom/pan/crosshair, order ticket (market/limit/stop), positions strip |
| Strategies | `/strategies` | London HARSI + Pulse Confluence + Breakout+Trend cards, enable/disable, per-strategy settings, recent signals |
| Signals | `/signals` | Active/history with strategy/asset/side/status filters; click Why? for entry/stop/target/R:R/checks |
| Positions | `/positions` | Close, partial close, move SL/TP |
| Orders | `/orders` | Pending / filled / cancelled / rejected |
| History | `/history` | Searchable ledger with mode + broker + duration |
| Analytics | `/analytics` | Equity curve, win rate, PF, drawdown, by strategy/symbol/weekday/long-short (Trader+) |
| Backtest | `/backtest` | No look-ahead, saved runs (Trader+) |
| Risk | `/risk` | %/trade, size, daily loss, exposure, loss-streak stop, kill switch |
| Brokers | `/brokers` | Paper working; OANDA/Alpaca/IBKR/Binance adapter-ready; MT5/FXCM placeholders |
| Automation | `/automation` | Per-strategy alerts/paper/live toggles, live needs explicit confirm, STOP ALL |
| Market | `/market` | Sydney/Tokyo/London/NY open states, countdown, timezone, calendar (not fabricated) |
| Settings | `/settings` | Profile, timezone, lots, chart prefs, notifications, risk, subscription |
| Activity | `/activity` | Audit log (login, strategy, broker, orders, risk blocks) |
| Alerts | `/alerts` | Legacy alert stream (kept for compatibility) |

## Strategies

- **London HARSI** — Asian midpoint distance in pips; configurable bands (default buy [-30,-15], sell [+15,+30]), T-15 window, first-print-per-zone, SL/TP.
- **Pulse Confluence** — EMA 9/21 + RSI + MACD expansion + ATR expansion + trend filter; every signal lists each check with values; ATR-scaled SL/TP.
- **Breakout + Trend** — N-bar range break + EMA50 trend + ATR expansion + volume confirmation; Pro tier.

Pipeline: `Strategy → Signal → Risk Manager → Order Manager → BrokerAdapter`.

## Broker architecture

```ts
interface BrokerAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccount(): Promise<Account>;
  getPositions(): Promise<Position[]>;
  getOrders(): Promise<Order[]>;
  placeOrder(order: OrderRequest): Promise<Order>;
  cancelOrder(id: string): Promise<void>;
  closePosition(id: string): Promise<void>;
}
```

- `PaperBrokerAdapter` (`src/lib/brokerAdapters.js`) is fully implemented.
- Live venues implement the same interface; secrets must live server-side (see `.env.example`).
- Working now: **Paper**. Adapter-ready (SIMULATED link, no real fills): OANDA, Alpaca, IBKR, Binance market data. Placeholders: MT5, FXCM.

## Market data

`MarketDataProvider` (`src/lib/market.js`) is separate from `BrokerAdapter`. BTC/ETH stream live
Binance WS when `REACT_APP_LIVE_FEED=true`; everything else uses the seeded demo feed labeled
`SIMULATED · demo feed`. `resample()` builds 1m/5m/15m/1h views from the 1m engine.

## Database (production path)

Client build persists per-user state in `localStorage` (`harsi.*.v2`) so the desk survives refresh
without a backend. Production tables map 1:1:

`users, subscriptions, strategies, strategy_configs, signals, alerts, orders, trades, positions,
broker_connections, backtests, audit_logs`

Suggested stack: Next.js API + PostgreSQL + Prisma + WebSockets; broker secrets in a vault
(Striple for billing). Until that backend exists, subscription gates run in `src/lib/storage.js`
(`planAllows`) and must be re-enforced server-side — the UI never trusts itself for money movement.

## Local setup

```bash
npm install
npm start        # http://localhost:3000
npm test         # CI=true npm test -- --watchAll=false
npm run build
```

Demo seats (only when `REACT_APP_DEMO_MODE=true`): `trader@harsi.ai / harsi123` (Trader),
`desk@harsi.ai / harsi123` (Pro). New signups start on Free.

## Testing

- `src/lib/algorithms.test.js` — HARSI buy/sell/window, Pulse trend
- `src/lib/risk.test.js` — size, exposure, kill switch, pass-through
- `src/lib/strategies.test.js` — breakout checks, flat-market silence
- `src/lib/backtest.test.js` — stats shape, empty-input guard
- Manual journey: landing → signup → dashboard → terminal → chart TF/zoom → HARSI/Pulse signal → paper BUY → position → partial/close → history → analytics → backtest → risk block → automation STOP ALL → logout

## Deployment

- **Frontend (ready):** connect `AmiraliEsi83/harsi-trading` to Vercel; `vercel.json` builds `npm run build` → `build/`. No extra step.
- **Backend/DB (needs your keys):** provision hosted Postgres (Railway/Render/Fly/Neon), set `DATABASE_URL`, deploy API, set `REACT_APP_API_URL`, add Stripe keys, move broker secrets server-side, then flip `REACT_APP_DEMO_MODE=false`.
- GitHub Pages (`gh-pages`) is no longer used; do not deploy to `AmiraliEsi83.github.io/Test`.

## Limitations (honest)

- No real order routing yet — live brokers are adapters/placeholders, correctly labeled.
- No real economic calendar provider — will not fabricate events.
- Auth is demo-grade localStorage; needs server sessions + Stripe webhooks for production.
- Backtests use the demo candle engine; live-portfolio backtests need a real history provider.
- This is a CRA SPA, not yet the `/apps/web + /apps/api + /packages/*` monorepo — structure is
  staged (`src/lib/*` maps to future packages) to keep the app runnable today.

## Domain

Use the Vercel URL for `harsi-trading` (e.g. `https://harsi-trading.vercel.app`) — do not reuse
`AmiraliEsi83.github.io/Test`. Custom domain: add it in Vercel → Settings → Domains.
