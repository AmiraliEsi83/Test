import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./db.js";
import { PLANS, type PlanId, hasPlan } from "@harsi/shared";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-secret");
export const COOKIE = "harsi_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: { sub: string; email: string; plan: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function readSession(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as { sub: string; email: string; plan: string };
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  reply.header(
    "Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`
  );
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.header("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
}

function cookieFromRequest(req: FastifyRequest) {
  const plugin = (req as FastifyRequest & { cookies?: Record<string, string> }).cookies?.[COOKIE];
  if (plugin) return plugin;
  const raw = String(req.headers.cookie || "");
  const found = raw.split(";").map((s) => s.trim()).find((p) => p.startsWith(`${COOKIE}=`));
  return found ? found.slice(COOKIE.length + 1) : "";
}

export async function currentUser(req: FastifyRequest) {
  const token = cookieFromRequest(req);
  if (!token) return null;
  try {
    const session = await readSession(token);
    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const user = await currentUser(req);
  if (!user) {
    reply.code(401).send({ error: "Authentication required" });
    return null;
  }
  return user;
}

export async function requirePlan(req: FastifyRequest, reply: FastifyReply, plan: PlanId) {
  const user = await requireUser(req, reply);
  if (!user) return null;
  if (!hasPlan(user.plan as PlanId, plan)) {
    reply.code(403).send({
      error: "Subscription required",
      required: plan,
      current: user.plan,
      plan: PLANS[user.plan as PlanId] || PLANS.free,
    });
    return null;
  }
  return user;
}

export async function audit(userId: string, action: string, detail: string) {
  await prisma.auditLog.create({ data: { userId, action, detail } });
}
