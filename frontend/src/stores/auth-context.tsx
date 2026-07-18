'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, saveTokens } from '../lib/api-client';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '../lib/constants';
import { authService, LoginInput, RegisterInput } from '../services/auth.service';
import type { SafeUser } from '../types/api';

interface AuthContextValue {
  user: SafeUser | null;
  /** true trong lúc đọc localStorage lần đầu (tránh nháy màn hình login) */
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Cập nhật thông tin user hiện tại trong context + localStorage (vd sau khi đổi avatar) */
  updateUser: (user: SafeUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Auth state — Context API, token lưu localStorage (đánh đổi chấp nhận được cho demo) */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored && token) {
      try {
        setUser(JSON.parse(stored) as SafeUser);
      } catch {
        clearSession();
      }
    }
    setIsInitializing(false);
  }, []);

  const persistSession = useCallback((result: { user: SafeUser; tokens: { accessToken: string; refreshToken: string; accessExpiresIn: string } }) => {
    saveTokens(result.tokens);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await authService.login(input);
      persistSession(result);
      router.push('/chat');
    },
    [persistSession, router],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await authService.register(input);
      persistSession(result);
      router.push('/chat');
    },
    [persistSession, router],
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } catch {
      // Kể cả khi gọi API logout lỗi, vẫn xóa session cục bộ để đăng xuất chắc chắn
    }
    clearSession();
    setUser(null);
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((nextUser: SafeUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({ user, isInitializing, isAuthenticated: !!user, login, register, logout, updateUser }),
    [user, isInitializing, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
