import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { encodePass, getSession, getUsers, PLANS, saveSession, saveUsers } from "../lib/storage";
import { logAudit } from "../lib/audit";

const AuthContext = createContext(null);

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    const users = getUsers();
    const session = getSession();
    if (session?.email) {
      const found = users.find((u) => u.email === session.email);
      if (found) {
        const migrated = { ...found, plan: found.plan === "elite" ? "pro" : found.plan === "pro" && !PLANS.pro ? "trader" : found.plan };
        setUser(migrated);
      }
    }
    setReady(true);
  }, []);

  const persistUser = (next) => {
    const users = getUsers().map((u) => (u.id === next.id ? next : u));
    saveUsers(users);
    setUser(next);
    saveSession({ email: next.email });
  };

  const value = useMemo(() => {
    const plan = PLANS[user?.plan || "free"] || PLANS.free;
    return {
      user,
      ready,
      plan,
      isAuthed: Boolean(user),
      audit,
      login: (email, password) => {
        const found = getUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!found || found.pass !== encodePass(password)) {
          throw new Error("Email or password is incorrect.");
        }
        const migrated = { ...found, plan: found.plan === "elite" ? "pro" : found.plan };
        setUser(migrated);
        saveSession({ email: migrated.email });
        setAudit((p) => logAudit(p, { kind: "login", message: `Login ${migrated.email}` }));
        return migrated;
      },
      signup: ({ name, email, password }) => {
        const users = getUsers();
        if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error("An account with that email already exists.");
        }
        const created = {
          id: uid("u"),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          pass: encodePass(password),
          plan: "free",
          createdAt: Date.now(),
        };
        saveUsers([...users, created]);
        setUser(created);
        saveSession({ email: created.email });
        setAudit((p) => logAudit(p, { kind: "login", message: `Signup ${created.email} (Free)` }));
        return created;
      },
      logout: () => {
        setAudit((p) => logAudit(p, { kind: "logout", message: `Logout ${user?.email || ""}` }));
        setUser(null);
        saveSession(null);
      },
      subscribe: (planId) => {
        if (!user) throw new Error("Sign in first.");
        if (!PLANS[planId]) throw new Error("Unknown plan.");
        const next = { ...user, plan: planId, subscribedAt: Date.now() };
        persistUser(next);
        setAudit((p) => logAudit(p, { kind: "subscription_changed", message: `Plan -> ${planId}` }));
        return next;
      },
      forgotPassword: async () => {
        return { ok: true, message: "Password reset is handled via email link in production. Set REACT_APP_AUTH_PROVIDER to enable." };
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready, audit]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
