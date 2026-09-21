import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, SubscriptionTier } from '@harsi/shared';

interface AuthContextType {
  user: User | null;
  token: string | null;
  plan: SubscriptionTier;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, plan?: SubscriptionTier) => Promise<void>;
  logout: () => void;
  quickDemoLogin: (role: 'TRADER' | 'PRO') => Promise<void>;
  upgradePlan: (plan: SubscriptionTier) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('harsi_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('harsi_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to authenticate token:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in');
    }
    localStorage.setItem('harsi_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    plan: SubscriptionTier = 'TRADER'
  ) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account');
    }
    localStorage.setItem('harsi_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const quickDemoLogin = async (role: 'TRADER' | 'PRO') => {
    const email = role === 'PRO' ? 'pro@harsi.ai' : 'trader@harsi.ai';
    await login(email, 'password123');
  };

  const logout = () => {
    localStorage.removeItem('harsi_token');
    setToken(null);
    setUser(null);
  };

  const upgradePlan = async (newPlan: SubscriptionTier) => {
    if (!token) throw new Error('Not logged in');
    const res = await fetch('/api/subscription/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan: newPlan }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upgrade plan');
    localStorage.setItem('harsi_token', data.token);
    setToken(data.token);
    if (user) {
      setUser({ ...user, subscriptionTier: newPlan });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        plan: user?.subscriptionTier || 'FREE',
        loading,
        login,
        signup,
        logout,
        quickDemoLogin,
        upgradePlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
