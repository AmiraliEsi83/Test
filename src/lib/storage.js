const KEYS = {
  users: "harsi.users.v1",
  session: "harsi.session.v1",
  trading: "harsi.trading.v1",
};

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

export function seedUsers() {
  const existing = read(KEYS.users, []);
  if (existing.length) return existing;
  const users = [
    {
      id: "u_demo_pro",
      name: "Ava Moreau",
      email: "trader@harsi.ai",
      pass: encodePass("harsi123"),
      plan: "pro",
      createdAt: Date.now() - 86400000 * 18,
    },
    {
      id: "u_demo_elite",
      name: "Amir Ali",
      email: "desk@harsi.ai",
      pass: encodePass("harsi123"),
      plan: "elite",
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
  return read(KEYS.session, null);
}

export function saveSession(session) {
  if (!session) localStorage.removeItem(KEYS.session);
  else write(KEYS.session, session);
}

export function loadTrading(userId) {
  const all = read(KEYS.trading, {});
  const paper = {
    id: "paper",
    type: "paper",
    name: "Harsi Paper Desk",
    status: "connected",
    accountId: "PAPER-8801",
    balance: 100000,
    currency: "USD",
    leverage: 50,
    connectedAt: Date.now(),
  };
  const saved = all[userId] || {};
  const brokers = saved.brokers?.length ? saved.brokers : [paper];
  if (!brokers.some((b) => b.id === "paper")) brokers.unshift(paper);
  return {
    brokers,
    activeBrokerId: saved.activeBrokerId || "paper",
    positions: saved.positions || [],
    orders: saved.orders || [],
    alerts: saved.alerts || [],
    closed: saved.closed || [],
    settings: {
      sound: true,
      desktop: true,
      autoExecute: false,
      forceLondonWindow: true,
      riskPercent: 1,
      defaultLots: 0.1,
      ...(saved.settings || {}),
    },
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
    name: "Scout",
    price: 0,
    tagline: "Watch the tape. No live alerts.",
    features: [
      "Live chart & session clock",
      "Harsi reading (delayed)",
      "Paper account only",
      "No open/close alerts",
    ],
    alerts: false,
    execute: false,
    brokers: 0,
    autoExecute: false,
  },
  pro: {
    id: "pro",
    name: "Operator",
    price: 49,
    tagline: "Live Harsi + Pulse alerts and broker execution.",
    features: [
      "Instant open & close alerts",
      "London Harsi + Pulse Confluence",
      "1 live broker + paper desk",
      "One-tap order ticket",
      "Desktop & sound alerts",
    ],
    alerts: true,
    execute: true,
    brokers: 1,
    autoExecute: false,
    featured: true,
  },
  elite: {
    id: "elite",
    name: "Desk",
    price: 129,
    tagline: "Full desk: multi-broker, auto-execute, priority signals.",
    features: [
      "Everything in Operator",
      "Up to 6 simultaneous brokers",
      "Auto-execute on Harsi prints",
      "Priority Pulse recommendations",
      "Session replay & risk desk",
    ],
    alerts: true,
    execute: true,
    brokers: 6,
    autoExecute: true,
  },
};
