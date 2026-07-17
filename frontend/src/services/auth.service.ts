import { apiFetch } from '../lib/api-client';
import type { AuthResult, SafeUser } from '../types/api';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  register: (input: RegisterInput) =>
    apiFetch<AuthResult>('/auth/register', { method: 'POST', body: input, skipAuth: true }),

  login: (input: LoginInput) =>
    apiFetch<AuthResult>('/auth/login', { method: 'POST', body: input, skipAuth: true }),

  logout: (refreshToken: string) =>
    apiFetch<{ message: string }>('/auth/logout', { method: 'POST', body: { refreshToken } }),

  getProfile: () => apiFetch<SafeUser & { citizenProfile: unknown }>('/users/profile'),
};
