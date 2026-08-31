import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  encodePass,
  getSession,
  getUsers,
  PLANS,
  saveSession,
  saveUsers,
} from "../lib/storage";

const AuthContext = createContext(null);

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const users = getUsers();
    const session = getSession();
    if (session?.email) {
      const found = users.find((u) => u.email === session.email);
      if (found) setUser(found);
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
    const plan = PLANS[user?.plan || "free"];
    return {
      user,
      ready,
      plan,
      isAuthed: Boolean(user),
      login: (email, password) => {
        const found = getUsers().find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (!found || found.pass !== encodePass(password)) {
          throw new Error("Email or password is incorrect.");
        }
        setUser(found);
        saveSession({ email: found.email });
        return found;
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
        return created;
      },
      logout: () => {
        setUser(null);
        saveSession(null);
      },
      subscribe: (planId) => {
        if (!user) throw new Error("Sign in first.");
        const next = {
          ...user,
          plan: planId,
          subscribedAt: Date.now(),
        };
        persistUser(next);
        return next;
      },
    };
  }, [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
