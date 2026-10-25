import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../api/client.js';
import { UserProfile } from '../types/shared.js';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{
    requires2FA: boolean;
    twoFactorToken?: string;
    availableMethods?: string[];
  }>;
  verify2FA: (twoFactorToken: string, method: string, code: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('nina_access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await ApiClient.get<{ user: UserProfile }>('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.warn('Session check failed, logging out:', err);
      localStorage.removeItem('nina_access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await ApiClient.post<any>('/auth/login', { identifier, password });

    if (res.requires2FA) {
      return {
        requires2FA: true,
        twoFactorToken: res.twoFactorToken,
        availableMethods: res.availableMethods,
      };
    }

    // Direct login successful
    localStorage.setItem('nina_access_token', res.accessToken);
    setUser(res.user);
    return { requires2FA: false };
  };

  const verify2FA = async (twoFactorToken: string, method: string, code: string) => {
    const res = await ApiClient.post<any>('/auth/2fa/verify', {
      twoFactorToken,
      method,
      code,
    });
    localStorage.setItem('nina_access_token', res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('nina_access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verify2FA,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
