'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { KivyClient } from '@/services/api/kivyClient';
import type { UserProfile } from '@/services/api/kivyClient';

interface AuthContextValue {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, role: 'SELLER' | 'ADMIN') => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const client = new KivyClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // starts true while we probe the session

  // On mount, check if there is a valid session cookie via /auth/me
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await client.auth.me();
        if (!cancelled) setUser(profile);
      } catch {
        // No valid session — user is logged out; swallow the error
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const profile = await client.auth.login({ email, password });
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, role: 'SELLER' | 'ADMIN'): Promise<void> => {
    setIsLoading(true);
    try {
      await client.auth.register({ email, password, role });
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await client.auth.logout();
    } catch {
      // Ignore network errors during logout — clear state regardless
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
