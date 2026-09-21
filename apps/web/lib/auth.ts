import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { INSTRUMENT_LIST, PLANS, parseJson, type PlanId } from "@harsi/shared";
import { STRATEGIES } from "@harsi/strategies";
import { prisma } from "./prisma";

const COOKIE = "harsi_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) throw new Error("AUTH_SECRET is missing or too short.");
  return new TextEncoder().encode(value);
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export function sessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  timezone: string;
  executionMode: "paper" | "live";
  liveArmed: boolean;
  plan: PlanId;
  planSource: string;
  planNote: string;
  prefs: {
    defaultSymbol: string;
    chartTimeframe: string;
    showEma: boolean;
    showVolume: boolean;
    showSessions: boolean;
    showSignals: boolean;
    browserAlerts: boolean;
    emailAlerts: boolean;
    webhookSet: boolean;
    notifySignal: boolean;
    notifyEntry: boolean;
    notifyExit: boolean;
    notifyStop: boolean;
    notifyTarget: boolean;
    notifyBroker: boolean;
    notifyRisk: boolean;
  };
  risk: {
    riskPerTradePct: number;
    maxPositionNotional: number;
    maxDailyLoss: number;
    maxOpenPositions: number;
    maxSymbolNotional: number;
    maxConsecutiveLosses: number;
    killSwitch: boolean;
    commissionBps: number;
    slippagePips: number;
  };
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { subscription: true, prefs: true, risk: true },
    });
    if (!user || !user.prefs || !user.risk || !user.subscription) return null;
    const plan = (PLANS[user.subscription.plan as PlanId] ? user.subscription.plan : "free") as PlanId;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      executionMode: user.executionMode === "live" ? "live" : "paper",
      liveArmed: user.liveArmed,
      plan,
      planSource: user.subscription.source,
      planNote: user.subscription.note,
      prefs: {
        defaultSymbol: user.prefs.defaultSymbol,
        chartTimeframe: user.prefs.chartTimeframe,
        showEma: user.prefs.showEma,
        showVolume: user.prefs.showVolume,
        showSessions: user.prefs.showSessions,
        showSignals: user.prefs.showSignals,
        browserAlerts: user.prefs.browserAlerts,
        emailAlerts: user.prefs.emailAlerts,
        webhookSet: Boolean(user.prefs.webhookUrl),
        notifySignal: user.prefs.notifySignal,
        notifyEntry: user.prefs.notifyEntry,
        notifyExit: user.prefs.notifyExit,
        notifyStop: user.prefs.notifyStop,
        notifyTarget: user.prefs.notifyTarget,
        notifyBroker: user.prefs.notifyBroker,
        notifyRisk: user.prefs.notifyRisk,
      },
      risk: {
        riskPerTradePct: user.risk.riskPerTradePct,
        maxPositionNotional: user.risk.maxPositionNotional,
        maxDailyLoss: user.risk.maxDailyLoss,
        maxOpenPositions: user.risk.maxOpenPositions,
        maxSymbolNotional: user.risk.maxSymbolNotional,
        maxConsecutiveLosses: user.risk.maxConsecutiveLosses,
        killSwitch: user.risk.killSwitch,
        commissionBps: user.risk.commissionBps,
        slippagePips: user.risk.slippagePips,
      },
    };
  } catch {
    return null;
  }
}

export async function createAccount(input: { email: string; password: string; name: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false as const, error: "An account with that email already exists." };
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash,
      subscription: { create: { plan: "free", source: "signup", note: "" } },
      paper: { create: { cash: 100000, startBalance: 100000 } },
      risk: { create: {} },
      prefs: { create: {} },
      brokers: {
        create: { broker: "paper", environment: "paper", status: "connected", accountLabel: "Paper 100,000" },
      },
      watchItems: { create: INSTRUMENT_LIST.map((inst, sort) => ({ symbol: inst.symbol, sort })) },
      strategies: {
        create: STRATEGIES.map((strategy) => ({
          strategyId: strategy.id,
          enabled: true,
          symbols: JSON.stringify(["EURUSD", "GBPUSD"]),
          timeframe: strategy.id === "breakout-trend" ? "15m" : "5m",
          params: JSON.stringify(strategy.defaults),
          alerts: false,
          paperAuto: false,
          liveAuto: false,
        })),
      },
      audits: { create: { action: "signup", detail: "Account created on the Free plan." } },
    },
  });
  return { ok: true as const, userId: user.id };
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return { ok: false as const, error: "Email or password is incorrect." };
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { ok: false as const, error: "Email or password is incorrect." };
  await prisma.auditLog.create({ data: { userId: user.id, action: "login", detail: "Signed in." } });
  return { ok: true as const, userId: user.id };
}

const attempts = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export function readStored<T>(raw: string, fallback: T): T {
  return parseJson(raw, fallback);
}
