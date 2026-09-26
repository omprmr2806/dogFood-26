'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, LoginRequest, RegisterRequest } from '@dogfood/shared';
import { apiGetMe, apiLogin, apiLogout, apiRegister } from '../lib/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<UserProfile>;
  register: (data: RegisterRequest) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await apiGetMe();
      setUser(current);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (data: LoginRequest): Promise<UserProfile> => {
    const loggedInUser = await apiLogin(data);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (data: RegisterRequest): Promise<UserProfile> => {
    const registeredUser = await apiRegister(data);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
