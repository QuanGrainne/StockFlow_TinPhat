'use client';

import { tabSession } from '@/lib/auth/tabSession';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === 'undefined') return { user: null, token: null, isAuthenticated: false };
    const token = tabSession.get('stockflow_token');
    const userStr = tabSession.get('stockflow_user');
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    return { user, token, isAuthenticated: !!token };
  });

  const login = useCallback((token: string, user: User) => {
    tabSession.set('stockflow_token', token);
    tabSession.set('stockflow_user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    tabSession.remove('stockflow_token');
    tabSession.remove('stockflow_user');
    setState({ user: null, token: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
