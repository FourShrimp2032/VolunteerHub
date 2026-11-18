"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api } from "./api";
import type { Me } from "./types";

type AuthState = {
  user: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: Me | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Me | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const r = await api<{ user: Me | null }>("/auth/me");
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = React.useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, refresh, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

/** Redirects to /login when the visitor is not signed in. Returns the user once known. */
export function useRequireAuth(opts: { admin?: boolean } = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    else if (opts.admin && user.role !== "admin") router.replace("/dashboard");
  }, [loading, user, opts.admin, router]);
  return { user: user && (!opts.admin || user.role === "admin") ? user : null, loading };
}
