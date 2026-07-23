"use client";

import { useState, createContext, useContext, useEffect } from "react";

export type User = { id: string; name?: string | null; email?: string | null; image?: string | null };

const AuthContext = createContext<{ user: User | null; loading: boolean; login: (email: string, password: string) => Promise<boolean>; register: (name: string, email: string, password: string) => Promise<boolean>; logout: () => void }>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) { setUser(data.user); return true; }
      return false;
    } catch { return false; }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!data.success) return false;
      // Auto-login after register
      return await login(email, password);
    } catch { return false; }
  };

  const logout = () => {
    document.cookie = "auth-token=; path=/; max-age=0";
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
