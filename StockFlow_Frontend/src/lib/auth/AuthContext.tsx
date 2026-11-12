'use client';

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
    const token = localStorage.getItem('stockflow_token');
    const userStr = localStorage.getItem('stockflow_user');
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    return { user, token, isAuthenticated: !!token };
  });

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('stockflow_token', token);
    localStorage.setItem('stockflow_user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('stockflow_token');
    localStorage.removeItem('stockflow_user');
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
