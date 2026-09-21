# HARSI AI Trading Platform — Institutional Algo Terminal

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-2D3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-19%20Passing-brightgreen.svg)]()

> **Notice:** HARSI is an institutional-grade algorithmic trading software terminal, signal engine, and execution pipeline. Strategy outputs and signals are quantitative research and algorithmic models, **not financial advice or guaranteed profit predictions**. Real capital trading involves substantial risk of loss.

---

## Architecture & Monorepo Structure

The project is structured as a production-grade monorepo using npm workspaces:

```
├── apps/
│   ├── web/                    # React 18, Vite, TailwindCSS, Lightweight-Charts frontend
│   │   ├── src/
│   │   │   ├── components/     # Terminal chart, watchlist, order ticket, modals
│   │   │   ├── context/        # AuthContext, TradingContext (WebSocket)
│   │   │   ├── pages/          # 14 complete institutional pages
│   │   │   └── App.tsx         # Protected route layout & navigation
│   └── api/                    # Express.js, WebSockets, Prisma ORM, JWT auth
│       ├── src/
│       │   ├── db/             # Prisma client & seed scripts
│       │   ├── middleware/     # JWT authentication & subscription authorization
│       │   ├── routes/         # REST API endpoints (14 route modules)
│       │   ├── services/       # Core TradingService singleton & streaming feed
│       │   └── server.ts       # HTTP & WebSocket server entrypoint
│
├── packages/
│   ├── shared/                 # Core domain models, instruments, and constants
│   ├── market-data/            # Technical indicators (EMA, RSI, MACD, ATR, Bollinger, HARSI)
│   ├── strategies/             # Pluggable StrategyPlugin framework & algorithms
│   ├── broker-adapters/        # BrokerAdapter interfaces (Paper, Alpaca, OANDA, IBKR)
│   └── trading-engine/         # RiskManager, OrderManager, ExecutionPipeline, Backtester
│
├── prisma/                     # Database schema (SQLite dev / PostgreSQL prod)
├── tests/                      # Automated test suite (unit, strategies, risk, API)
└── docker-compose.yml          # Containerized production stack configuration
```

---

## Key Features & Completed Modules

### 1. Public Landing Page (`/`)
- Dark, minimalist, financial terminal aesthetic with live-looking preview.
- Algorithmic explanations: London HARSI, Pulse Momentum Confluence, Breakout + Trend Confirmation.
- Transparent subscription pricing tiers (Free, Trader Pro, Institutional Pro).
- Prominent risk disclaimer and platform security overview.

### 2. Authentication & Authorization (`/login`, `/signup`)
- JWT session bearer authentication with bcrypt password hashing.
- Backend-enforced subscription tier authorization (`requireSubscription('PRO')`).
- Quick demo login buttons for instant platform evaluation:
  - **Trader Pro**: `trader@harsi.ai` (Password: `password123`)
  - **Institutional Pro**: `pro@harsi.ai` (Password: `password123`)

### 3. Main Trading Terminal (`/dashboard`)
- **Top Bar**: Live global session tracker, London T-15 simulation toggle, Paper/Live mode indicator, Emergency Stop button, real-time WebSocket latency, and user profile.
- **Portfolio Summary**: Real-time equity, cash balance, buying power, today's P/L, total return, open risk %, and max drawdown.
- **Interactive Candlestick Chart**: Powered by Lightweight Charts with crosshair, OHLC values, volume histogram, dynamic EMA lines (9, 21, 50), and Asian session high/low/mid projections.
- **Order Ticket**: Instant market order execution, lot size calculation, stop loss, and take profit targeting.
- **Institutional Signals Feed**: Real-time signal stream with detailed "Explain" modal revealing quantitative condition criteria.

### 4. Pluggable Algorithmic Strategies (`/strategies`)
1. **London HARSI Mean-Reversion**:
   - Calculates Asian session equilibrium midpoint (00:00–07:45 London time).
   - Monitors price deviation during London opening T-15 window (07:45–08:30 London).
   - Generates high-probability BUY alerts on −15 to −30 pip deviations, and SELL alerts on +15 to +30 pip deviations.
2. **Pulse Momentum Confluence**:
   - Multi-indicator confirmation combining EMA 9 > EMA 21, RSI momentum filter (45–65), MACD histogram crossover, and ATR expansion.
   - Transparent checklist output: no opaque "AI confidence" numbers.
3. **Breakout + Trend Confirmation**:
   - Evaluates higher timeframe trend alignment with decisive breaches of previous session highs/lows and ATR volatility expansion.

### 5. First-Class Paper Trading Engine
- Realistic order fills, commission deductions, spread, and slippage calculations.
- Live position mark-to-market valuations and P/L updates.
- Supports Stop Loss, Take Profit, position modifications, partial closures, and full closures.
- SQLite/PostgreSQL persistence across browser refreshes.

### 6. Centralized Risk Manager (Rule Engine)
Automated strategies and manual tickets pass through the Risk Manager before order dispatch:
1. Master Emergency Kill Switch.
2. Max risk per trade (% of equity).
3. Max position size (lots).
4. Max daily loss limit ($ USD circuit breaker).
5. Max concurrent open positions.
6. Max exposure per individual asset.
7. Consecutive loss circuit breaker & cooldown period.

### 7. Broker Adapter Architecture (`/brokers`)
- Standardized `BrokerAdapter` interface:
  - **HARSI Institutional Paper Desk**: Fully active, simulated zero-risk execution.
  - **Alpaca Markets**: Connects to Alpaca Paper & Live API.
  - **OANDA FX & Metals**: Connects to OANDA v20 practice & live endpoints.
  - **Interactive Brokers (CP Gateway)**: Connects to local IBKR Client Portal Gateway.
  - Clearly displays **NOT CONFIGURED** when credentials are not supplied. Server-side API key encryption at rest (no frontend leakage).

### 8. Event-Driven Backtesting Lab (`/backtest`)
- Run event-driven simulations across historical candle feeds.
- Configurable starting balance ($10k–$1M), timeframe, instrument, and risk percentage.
- Avoids look-ahead bias with bar-by-bar progression.
- Displays interactive equity curves, win rates, profit factors, max drawdown, and detailed trade log.

### 9. Automation Controls & Emergency Stop (`/automation`)
- Per-strategy toggles: Signal Alerts, Paper Auto-Execute, and Live Auto-Execute.
- Explicit risk confirmation modal required before enabling live broker execution.
- Prominent **STOP ALL AUTOMATION** circuit breaker.

### 10. Additional Core Pages
- **Signals Center (`/signals`)**: Active and historical signals table with strategy and side filters.
- **Positions Page (`/positions`)**: Full positions ledger with real-time unrealized P/L, SL/TP modification, and partial close modal.
- **Orders Page (`/orders`)**: Separated tabs for Open, Filled, and Cancelled orders.
- **Trade History (`/history`)**: Searchable and filterable ledger of all closed trades.
- **Analytics Dashboard (`/analytics`)**: Sharpe ratio, win rate, profit factor, strategy breakdown, and directional long/short volume distribution.
- **Session & Economic Calendar (`/calendar`)**: Real-time clocks for Sydney, Tokyo, London, and New York, plus high-impact economic risk events (NFP, CPI, Fed Decisions).
- **Settings (`/settings`)**: Profile, timezone, default chart settings, risk guardrails, and notification webhooks.
- **Audit Log (`/audit`)**: Cryptographically timestamped ledger of every risk evaluation, order submission, broker change, and authentication event.

---

## Getting Started Locally

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
```bash
cp .env.example .env
```

### 3. Initialize & Seed Database
```bash
npm run db:push
npm run db:seed
```

### 4. Run Development Servers
```bash
npm run dev
```
- Web Terminal: `http://localhost:3000`
- REST & WebSocket API: `http://localhost:5001`

---

## Running Automated Tests

The platform includes a comprehensive automated test suite spanning unit tests, strategies, risk management, and API endpoints:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:strategies
npm run test:risk
npm run test:api
```

---

## Production Deployment

### 1. Standalone Repository Setup
To push HARSI into a brand new, completely independent GitHub repository (e.g. `AmiraliEsi83/harsi-trading`):
```bash
# Initialize clean repo
git init
git add .
git commit -m "feat: initial release of HARSI AI Trading Platform"
git branch -M main
git remote add origin https://github.com/AmiraliEsi83/harsi-trading.git
git push -u origin main
```

### 2. Frontend (Vercel)
The `apps/web` application is pre-configured for Vercel deployment:
- **Build Command**: `npm run build`
- **Output Directory**: `apps/web/dist`
- **Environment Variables**:
  - `VITE_API_URL`: URL of your deployed backend API (e.g. `https://api.harsi.ai`)

### 3. Backend & Database (Railway / Render / Fly.io / Docker)
Use the included `Dockerfile` and `docker-compose.yml`:
```bash
docker-compose up --build
```
Or deploy on Railway / Render by pointing to `apps/api` with PostgreSQL database provisioning.
- **Environment Variables**:
  - `DATABASE_URL`: `postgresql://user:password@host:5432/harsi`
  - `JWT_SECRET`: Secure 64-character random string
  - `PORT`: `5001`

---

## Risk Disclaimer

Algorithmic trading entails significant financial risk. Backtested performance and paper trading simulations do not represent actual future trading results. Execution speed, slippage, liquidity gaps, and broker connectivity issues can result in substantial losses. Only trade with risk capital you can afford to lose.
