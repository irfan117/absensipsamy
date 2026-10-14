import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  authReady: boolean;
  jwtToken: string | null;
  loginWithCode: (code: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  loginWithAdmin: (identifier: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(() => api.getToken());
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  const loginWithCode = async (code: string, password?: string) => {
    try {
      const res = await api.loginWithCode(code, password);
      if (res.success && res.user && res.token) {
        setCurrentUser(res.user as User);
        setJwtToken(res.token);
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal terhubung ke server.' };
    }
  };

  const loginWithAdmin = async (identifier: string, password?: string) => {
    try {
      const res = await api.loginWithAdmin(identifier, password);
      if (res.success && res.user && res.token) {
        setCurrentUser(res.user as User);
        setJwtToken(res.token);
      }
      return res;
    } catch {
      return { success: false, message: 'Gagal terhubung ke server.' };
    }
  };

  const logout = () => {
    api.setToken(null);
    setJwtToken(null);
    setCurrentUser(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      return res;
    } catch {
      return { success: false, message: 'Gagal mengubah kata sandi.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        authReady,
        jwtToken,
        loginWithCode,
        loginWithAdmin,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
};

export default AuthContext;
