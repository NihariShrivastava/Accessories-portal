// src/components/auth-provider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

export type UserProfile = {
  id: string;
  role: string;
  name: string;
  assigned_counters?: string[];
  assigned_warehouses?: string[];
};

type AuthContextType = {
  user: UserProfile | null;
  profile: UserProfile | null; // Kept for backwards compatibility with your hooks
  loading: boolean;
  login: (userData: UserProfile, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, profile: null, loading: true, login: () => {}, logout: () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('portal_user');
    const storedToken = sessionStorage.getItem('portal_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData: UserProfile, token: string) => {
    sessionStorage.setItem('portal_token', token);
    sessionStorage.setItem('portal_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem('portal_token');
    sessionStorage.removeItem('portal_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile: user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);