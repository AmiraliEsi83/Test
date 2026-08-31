# HARSI Terminal

AI session automation for subscribed traders. Live chart, London Harsi alerts, Pulse Confluence recommendations, and broker execution.

**Live site (GitHub Pages):** [https://AmiraliEsi83.github.io/Test/](https://AmiraliEsi83.github.io/Test/)

## What it does

- **Login + subscription seats** — Scout (free) watches the tape. Operator and Desk receive live open/close alerts.
- **London Harsi** — 15 minutes before London cash opens, the first Harsi print between **−15 and −30** alerts **buy**. The first print between **+15 and +30** alerts **sell**.
- **Pulse Confluence** — EMA 9/21 + RSI + MACD + ATR expansion for a second professional buy/sell recommendation.
- **Live chart** — HARSI candle engine with Asian range lines, plus a TradingView institutional feed.
- **Brokers** — Paper desk is always on. Connect OANDA, Interactive Brokers, MetaTrader 5, Alpaca, Binance, or FXCM and open/close from the ticket or from an alert.

## Demo seats

| Seat | Email | Password |
| --- | --- | --- |
| Operator | trader@harsi.ai | harsi123 |
| Desk | desk@harsi.ai | harsi123 |

New signups start on Scout. Upgrade on Pricing (demo checkout, no charge).

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to GitHub Pages

```bash
npm run deploy
```

Publishes the `gh-pages` branch used by `https://amiraliesi83.github.io/Test/`.

## Disclaimer

Alerts and fills on this desk are for research and rehearsal. They are not financial advice. Live venue keys stay in your browser until you add a production order-routing backend.
