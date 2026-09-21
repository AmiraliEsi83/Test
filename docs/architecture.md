# Architecture

```
Browser (Next.js)
    │  cookie session, /api rewrite
    ▼
Fastify API
    │
    ├─ Auth (JWT httpOnly)
    ├─ Subscription gates
    ├─ MarketDataProvider  (simulated | public Binance)
    ├─ Strategy plugins    (HARSI, Pulse, Breakout)
    ├─ Risk manager
    ├─ PaperBroker (full) / OANDA / Alpaca / placeholders
    └─ Prisma (SQLite or Postgres)
```

Pipeline for automated orders:

```
Strategy.evaluate
    → Signal persisted
    → Alert (if plan allows)
    → Risk.evaluateRisk
    → PaperBroker.placeOrder  or live adapter
    → Position / Order / Trade / AuditLog
```

Live automation requires:

1. Pro plan
2. Header `X-Harsi-Live-Confirm: ENABLE_LIVE_AUTOMATION`
3. A broker adapter that actually connected

Otherwise the UI stays on PAPER / NOT CONNECTED.
