import { evaluateRisk, DEFAULT_RISK } from "./risk";

test("risk blocks oversized positions", () => {
  const r = evaluateRisk({ order: { symbol: "EURUSD", lots: 5 }, account: { balance: 100000 }, positions: [], closed: [], risk: DEFAULT_RISK });
  expect(r.allowed).toBe(false);
  expect(r.reasons.join(" ")).toMatch(/max/i);
});

test("risk blocks when max open positions reached", () => {
  const positions = Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, status: "open", symbol: "EURUSD" }));
  const r = evaluateRisk({ order: { symbol: "GBPUSD", lots: 0.1 }, account: { balance: 100000 }, positions, closed: [], risk: DEFAULT_RISK });
  expect(r.allowed).toBe(false);
});

test("kill switch halts everything", () => {
  const r = evaluateRisk({ order: { symbol: "EURUSD", lots: 0.1 }, account: { balance: 100000 }, positions: [], closed: [], risk: { ...DEFAULT_RISK, killSwitch: true } });
  expect(r.allowed).toBe(false);
});

test("clean order passes", () => {
  const r = evaluateRisk({ order: { symbol: "EURUSD", lots: 0.1 }, account: { balance: 100000 }, positions: [], closed: [], risk: DEFAULT_RISK });
  expect(r.allowed).toBe(true);
});
