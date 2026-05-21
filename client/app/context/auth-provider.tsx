"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthRole = "guest" | "admin";

interface AuthContextType {
  role: AuthRole | null;
  loading: boolean;
  loginGuest: () => Promise<void>;
  loginAdmin: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AuthRole | null>;
}

const BACKEND_URI =
  process.env.NEXT_PUBLIC_BACKEND_URI ?? "http://localhost:4000/api";
const GUEST_SESSION_KEY = "weather-app-auth-guest";

const AuthContext = createContext<AuthContextType>({
  role: null,
  loading: true,
  loginGuest: async () => {},
  loginAdmin: async () => {},
  logout: async () => {},
  refreshMe: async () => null,
});

export const useAuth = () => useContext(AuthContext);

function getStoredGuestRole(): AuthRole | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(GUEST_SESSION_KEY) === "true" ? "guest" : null;
}

function setStoredGuestRole(enabled: boolean) {
  if (typeof window === "undefined") return;

  if (enabled) {
    sessionStorage.setItem(GUEST_SESSION_KEY, "true");
  } else {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
  }
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<AuthRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async (): Promise<AuthRole | null> => {
    try {
      const response = await fetch(`${BACKEND_URI}/auth/me`, {
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok && data.role === "admin") {
        setStoredGuestRole(false);
        setRole("admin");
        return "admin";
      }
    } catch (error) {
      console.error("Failed to refresh auth session:", error);
    }

    const storedGuestRole = getStoredGuestRole();
    setRole(storedGuestRole);
    return storedGuestRole;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      setLoading(true);
      const nextRole = await refreshMe();
      if (isMounted) {
        setRole(nextRole);
        setLoading(false);
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [refreshMe]);

  const loginGuest = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URI}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "guest" }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.role !== "guest") {
        throw new Error(data.error || "Unable to sign in as guest.");
      }

      setStoredGuestRole(true);
      setRole("guest");
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAdmin = useCallback(async (password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URI}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.role !== "admin") {
        throw new Error(data.error || "Unable to sign in as admin.");
      }

      setStoredGuestRole(false);
      setRole("admin");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(`${BACKEND_URI}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to clear server auth session:", error);
    } finally {
      setStoredGuestRole(false);
      setRole(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      role,
      loading,
      loginGuest,
      loginAdmin,
      logout,
      refreshMe,
    }),
    [role, loading, loginGuest, loginAdmin, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
