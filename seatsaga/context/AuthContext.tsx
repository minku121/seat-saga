"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  getStoredToken,
  getStoredUser,
  setAuth as saveAuthStorage,
  clearAuth as removeAuthStorage,
  isTokenValid,
} from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: Partial<User>) => void;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncAuth = useCallback(() => {
    try {
      const storedToken = getStoredToken();
      if (storedToken && isTokenValid(storedToken)) {
        const storedUser = getStoredUser();
        setToken(storedToken);
        setUser(storedUser);
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncAuth();

    // Listen for cross-tab auth state changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        syncAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [syncAuth]);

  const login = useCallback(
    (newToken: string, newUser: Partial<User>) => {
      saveAuthStorage(newToken, newUser);
      const activeUser = getStoredUser();
      setToken(newToken);
      setUser(activeUser);
    },
    []
  );

  const logout = useCallback(() => {
    removeAuthStorage();
    setToken(null);
    setUser(null);
    router.push("/auth/login");
  }, [router]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
    refreshAuth: syncAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
