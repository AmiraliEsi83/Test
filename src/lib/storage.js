import { STRATEGY_DEFAULTS } from "./strategies";
import { DEFAULT_RISK } from "./risk";

const KEYS = {
  users: "harsi.users.v2",
  session: "harsi.session.v2",
  trading: "harsi.trading.v2",
  legacyTrading: "harsi.trading.v1",
  legacyUsers: "harsi.users.v1",
};

const SESSION_TTL_MS = 7 * 86400000;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function encodePass(pass) {
  try {
    return btoa(unescape(encodeURIComponent(pass)));
  } catch (e) {
    return pass;
  }
}

const DEMO_MODE = (process.env.REACT_APP_DEMO_MODE || "true") !== "false";

export function seedUsers() {
  let existing = read(KEYS.users, []);
  if (!existing.length) {
    try {
      const legacy = read(KEYS.legacyUsers, []);
      if (legacy.length) {
        existing = legacy.map((u) => ({
          ...u,
          plan: u.plan === "elite" ? "pro" : u.plan === "pro" ? "trader" : u.plan,
        }));
        write(KEYS.users, existing);
        return existing;
      }
    } catch (e) { /* ignore */ }
  }
  if (existing.length) return existing;
  if (!DEMO_MODE) { write(KEYS.users, []); return []; }
  const users = [
    {
      id: "u_demo_trader",
      name: "Ava Moreau",
      email: "trader@harsi.ai",
      pass: encodePass("harsi123"),
      plan: "trader",
      createdAt: Date.now() - 86400000 * 18,
    },
    {
      id: "u_demo_pro",
      name: "Amir Ali",
      email: "desk@harsi.ai",
      pass: encodePass("harsi123"),
      plan: "pro",
      createdAt: Date.now() - 86400000 * 40,
    },
  ];
  write(KEYS.users, users);
  return users;
}

export function getUsers() {
  return seedUsers();
}

export function saveUsers(users) {
  write(KEYS.users, users);
}

export function getSession() {
  const s = read(KEYS.session, null);
  if (!s) return null;
  if (s.expiresAt && s.expiresAt < Date.now()) {
    localStorage.removeItem(KEYS.session);
    return null;
  }
  return s;
}

export function saveSession(session) {
  if (!session) localStorage.removeItem(KEYS.session);
  else write(KEYS.session, { ...session, expiresAt: Date.now() + SESSION_TTL_MS });
}

export function seedTradingState() {
  const paper = {
    id: "paper",
    type: "paper",
    name: "Harsi Paper Desk",
    status: "connected",
    environment: "PAPER",
    accountId: "PAPER-8801",
    balance: 100000,
    currency: "USD",
    leverage: 50,
    connectedAt: Date.now(),
    lastSync: Date.now(),
  };
  return {
    brokers: [paper],
    activeBrokerId: "paper",
    mode: "paper",
    positions: [],
    orders: seedDemoOrders(),
    alerts: [],
    closed: seedDemoHistory(),
    signals: seedDemoSignals(),
    backtests: [],
    audit: [{ id: "log_seed", ts: Date.now(), kind: "login", message: "Demo workspace seeded (SIMULATED data)" }],
    watchlist: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSDT", "ETHUSDT", "SPY", "QQQ"],
    strategies: JSON.parse(JSON.stringify(STRATEGY_DEFAULTS)),
    automation: {
      "london-harsi": { alerts: true, paperAuto: true, liveAuto: false },
      "pulse-confluence": { alerts: true, paperAuto: false, liveAuto: false },
      "breakout-trend": { alerts: true, paperAuto: false, liveAuto: false },
      stopped: false,
    },
    risk: { ...DEFAULT_RISK },
    settings: {
      sound: true,
      desktop: false,
      autoExecute: false,
      forceLondonWindow: true,
      riskPercent: 1,
      defaultLots: 0.1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      chart: { showEma: true, showRsi: true, showMacd: false, showAtr: false, showSessions: true, showSr: true },
      notifications: { signal: true, entry: true, exit: true, stop: true, target: true, broker: true, risk: true },
    },
  };
}

function seedDemoSignals() {
  const now = Date.now();
  return [
    { id: "sig_seed_1", ts: now - 42 * 60000, symbol: "EURUSD", timeframe: "1m", algorithm: "london-harsi", side: "buy", price: 1.08312, entry: 1.08312, stop: 1.08092, target: 1.08652, status: "open", reason: "First Harsi print inside -30 to -15 during the London T-15 window.", checks: [{ label: "HARSI in [-30,-15]", pass: true, value: "-22.4" }, { label: "T-15 window", pass: true, value: "07:47 London" }, { label: "First print today", pass: true, value: "yes" }], slPips: 22, tpPips: 34, simulated: true },
    { id: "sig_seed_2", ts: now - 95 * 60000, symbol: "GBPUSD", timeframe: "5m", algorithm: "pulse-confluence", side: "sell", price: 1.27214, entry: 1.27214, stop: 1.27402, target: 1.26931, status: "closed", result: "win", reason: "EMA 9 below EMA 21 · RSI holding bearish mid-range · MACD expanding negative.", checks: [{ label: "EMA 9 < EMA 21", pass: true, value: "1.27201 vs 1.27244" }, { label: "RSI 46.2", pass: true, value: "46.2" }, { label: "MACD bearish expansion", pass: true, value: "-0.00012" }, { label: "ATR expansion 1.31x", pass: true, value: "1.31x" }, { label: "Trend filter", pass: true, value: "-6.4 pips" }], slPips: 18, tpPips: 28, simulated: true },
    { id: "sig_seed_3", ts: now - 180 * 60000, symbol: "XAUUSD", timeframe: "15m", algorithm: "breakout-trend", side: "buy", price: 2516.2, entry: 2516.2, stop: 2512.1, target: 2522.9, status: "closed", result: "loss", reason: "Breakout above 40-bar high with trend + ATR expansion.", checks: [{ label: "Breaks 40-bar range", pass: true, value: "> 2515.8" }, { label: "Trend filter (EMA 50)", pass: true, value: "price > EMA50" }, { label: "ATR expansion > 1.10x", pass: true, value: "1.24x" }, { label: "Volume confirmation > 1.20x", pass: false, value: "1.05x" }], slPips: 41, tpPips: 67, simulated: true },
  ];
}

function seedDemoHistory() {
  const now = Date.now();
  return [
    { id: "t_seed_1", symbol: "EURUSD", side: "buy", lots: 0.2, entry: 1.08112, exit: 1.08452, pnl: 68.0, algorithm: "london-harsi", brokerId: "paper", brokerName: "Harsi Paper Desk", mode: "paper", openedAt: now - 26 * 3600000, closedAt: now - 25 * 3600000, reason: "Take profit", simulated: true },
    { id: "t_seed_2", symbol: "GBPUSD", side: "sell", lots: 0.1, entry: 1.27412, exit: 1.2729, pnl: 12.2, algorithm: "pulse-confluence", brokerId: "paper", brokerName: "Harsi Paper Desk", mode: "paper", openedAt: now - 50 * 3600000, closedAt: now - 49 * 3600000, reason: "Take profit", simulated: true },
    { id: "t_seed_3", symbol: "XAUUSD", side: "buy", lots: 0.05, entry: 2519.4, exit: 2516.1, pnl: -16.5, algorithm: "breakout-trend", brokerId: "paper", brokerName: "Harsi Paper Desk", mode: "paper", openedAt: now - 74 * 3600000, closedAt: now - 73 * 3600000, reason: "Stop loss", simulated: true },
  ];
}

function seedDemoOrders() {
  const now = Date.now();
  return [
    { id: "ord_seed_1", symbol: "EURUSD", side: "buy", type: "limit", lots: 0.1, price: 1.0795, status: "pending", algorithm: "manual", brokerId: "paper", createdAt: now - 3600000, mode: "paper" },
    { id: "ord_seed_2", symbol: "GBPUSD", side: "sell", type: "market", lots: 0.1, price: 1.2718, status: "filled", algorithm: "pulse-confluence", brokerId: "paper", createdAt: now - 7200000, mode: "paper" },
  ];
}

export function loadTrading(userId) {
  const all = read(KEYS.trading, {});
  try {
    const legacyAll = read(KEYS.legacyTrading, {});
    if (!all[userId] && legacyAll[userId]) {
      const l = legacyAll[userId];
      const seeded = seedTradingState();
      const merged = {
        ...seeded,
        brokers: l.brokers?.length ? l.brokers : seeded.brokers,
        activeBrokerId: l.activeBrokerId || "paper",
        positions: l.positions || [],
        closed: [...(l.closed || []), ...seeded.closed].slice(0, 60),
        alerts: (l.alerts || []).slice(0, 80),
        settings: { ...seeded.settings, ...(l.settings || {}) },
      };
      all[userId] = merged;
      write(KEYS.trading, all);
      return merged;
    }
  } catch (e) { /* ignore */ }
  if (!all[userId]) {
    all[userId] = seedTradingState();
    write(KEYS.trading, all);
  }
  const s = all[userId];
  return {
    ...seedTradingState(),
    ...s,
    settings: { ...seedTradingState().settings, ...(s.settings || {}) },
    risk: { ...DEFAULT_RISK, ...(s.risk || {}) },
    strategies: { ...JSON.parse(JSON.stringify(STRATEGY_DEFAULTS)), ...(s.strategies || {}) },
    automation: { ...seedTradingState().automation, ...(s.automation || {}) },
  };
}

export function saveTrading(userId, state) {
  const all = read(KEYS.trading, {});
  all[userId] = state;
  write(KEYS.trading, all);
}

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "Chart, watchlist, delayed signals, paper trading.",
    features: ["Live/demo chart & sessions", "Watchlist", "Delayed/basic signals", "Paper trading (SIMULATED)", "No realtime alerts"],
    alerts: false,
    execute: true,
    paperExecute: true,
    strategies: ["london-harsi"],
    backtest: false,
    analytics: false,
    brokers: 0,
    autoExecute: false,
    webhooks: false,
  },
  trader: {
    id: "trader",
    name: "Trader",
    price: 49,
    tagline: "Realtime alerts, analytics, backtesting, paper automation.",
    features: ["Realtime strategy alerts", "London HARSI + Pulse Confluence", "Advanced analytics", "Backtesting", "Paper automation", "1 broker + paper desk"],
    alerts: true,
    execute: true,
    paperExecute: true,
    strategies: ["london-harsi", "pulse-confluence"],
    backtest: true,
    analytics: true,
    brokers: 1,
    autoExecute: false,
    paperAuto: true,
    webhooks: false,
    featured: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 129,
    tagline: "All strategies, broker integrations, advanced automation.",
    features: ["All strategies incl. Breakout", "Broker integrations", "Advanced automation + webhooks", "Priority signals", "Full risk desk", "Up to 6 brokers"],
    alerts: true,
    execute: true,
    paperExecute: true,
    strategies: ["london-harsi", "pulse-confluence", "breakout-trend"],
    backtest: true,
    analytics: true,
    brokers: 6,
    autoExecute: true,
    paperAuto: true,
    webhooks: true,
  },
};

export function planAllows(plan, capability, strategyId) {
  if (!plan) return false;
  if (capability === "strategy" && strategyId) return (plan.strategies || []).includes(strategyId);
  return Boolean(plan[capability]);
}
