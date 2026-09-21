import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/auth.js";
import { startRuntime, stopRuntime } from "../src/runtime.js";

const email = `test-${Date.now()}@harsi.test`;
let app: Awaited<ReturnType<typeof buildServer>>;
let cookie = "";

describe("HARSI API", () => {
  beforeAll(async () => {
    process.env.DEMO_MODE = "true";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    await startRuntime();
    app = await buildServer();
  });

  afterAll(async () => {
    stopRuntime();
    await prisma.user.deleteMany({ where: { email } }).catch(() => null);
    await app.close();
  });

  it("health is ok", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("signup + login + me", async () => {
    const signup = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { name: "Test Trader", email, password: "password12" },
    });
    expect(signup.statusCode).toBe(200);
    cookie = signup.headers["set-cookie"] as string;
    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie } });
    expect(me.json().user.email).toBe(email);
  });

  it("rejects bad login", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "wrong-password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("dashboard and paper order", async () => {
    const dash = await app.inject({ method: "GET", url: "/api/dashboard", headers: { cookie } });
    expect(dash.statusCode).toBe(200);
    expect(dash.json().modeLabel).toBe("PAPER");
    const order = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { cookie },
      payload: { symbol: "EURUSD", side: "buy", type: "market", lots: 0.1, mode: "paper" },
    });
    expect(order.statusCode).toBe(200);
    expect(order.json().label).toBe("PAPER");
    const pos = await app.inject({ method: "GET", url: "/api/positions", headers: { cookie } });
    expect(pos.json().positions.length).toBeGreaterThan(0);
    const id = pos.json().positions[0].id;
    const close = await app.inject({
      method: "POST",
      url: `/api/positions/${id}/close`,
      headers: { cookie },
      payload: {},
    });
    expect(close.statusCode).toBe(200);
    const hist = await app.inject({ method: "GET", url: "/api/history", headers: { cookie } });
    expect(hist.json().trades.length).toBeGreaterThan(0);
  });

  it("enforces subscription on analytics", async () => {
    const res = await app.inject({ method: "GET", url: "/api/analytics", headers: { cookie } });
    expect(res.statusCode).toBe(403);
  });

  it("live order without broker is NOT CONNECTED", async () => {
    await prisma.user.update({ where: { email }, data: { plan: "pro" } });
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "password12" },
    });
    cookie = login.headers["set-cookie"] as string;
    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: { cookie },
      payload: { symbol: "EURUSD", side: "buy", type: "market", lots: 0.1, mode: "live" },
    });
    expect(res.statusCode).toBe(400);
    expect(String(res.json().error)).toMatch(/NOT CONNECTED|Live execution/i);
  });
});

void hashPassword;
