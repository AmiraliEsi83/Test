# Architecture

HARSI keeps strategy math, the paper ledger, and broker HTTP calls out of React components.

- `packages/strategies` returns a signal plus the checks that passed or failed.
- `packages/trading-engine` sizes risk, fills paper orders, and walks backtests on closed bars only. A new entry is priced from the next bar's open. A bar that touches both stop and target is booked as a stop.
- `apps/web/lib/actions.ts` is the only place that turns a signal into an order. It checks the plan, the kill switch, and the broker status.
- Broker secrets are encrypted with `ENCRYPTION_KEY` and never returned to the browser.
- The terminal polls `/api/health` and `/api/dashboard`. Status dots distinguish a healthy API from a simulated tape and from polling (there is no websocket process).

Sessions are calculated on the London clock because HARSI is defined that way. The header clock uses the account timezone.
