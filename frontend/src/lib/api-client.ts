import { ACCESS_TOKEN_KEY, API_BASE_URL, REFRESH_TOKEN_KEY, USER_KEY } from './constants';
import { ApiClientError } from './api-error';
import type { ApiResponse, TokenPair } from '../types/api';

/**
 * API Client — fetch wrapper duy nhất của Frontend.
 * - Tự gắn Bearer access token.
 * - Tự refresh token 1 lần khi gặp 401, rồi thử lại request gốc.
 * - Luôn unwrap {success, data|error} và ném ApiClientError khi lỗi
 *   (khớp chuẩn response Backend đã đóng băng).
 */

let refreshPromise: Promise<string | null> | null = null;

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(tokens: TokenPair): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Gọi /auth/refresh — dùng chung 1 promise nếu nhiều request 401 cùng lúc */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const body = (await res.json()) as ApiResponse<TokenPair>;
        if (!res.ok || !body.success) return null;
        saveTokens(body.data);
        return body.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Không đính kèm Authorization header (dùng cho login/register/refresh) */
  skipAuth?: boolean;
  /** Không tự retry khi 401 (tránh vòng lặp vô hạn cho chính request refresh) */
  skipAuthRetry?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, skipAuth, skipAuthRetry, headers, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const doFetch = async (): Promise<Response> => {
    const token = skipAuth ? null : getAccessToken();
    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  // 401 + có refresh token + chưa retry -> thử refresh rồi gọi lại đúng 1 lần
  if (res.status === 401 && !skipAuth && !skipAuthRetry && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch();
    } else {
      clearSession();
    }
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError('NETWORK_ERROR', 'Không kết nối được tới máy chủ.', res.status);
  }

  if (!parsed.success) {
    throw new ApiClientError(parsed.error.code, parsed.error.message, res.status, parsed.error.details);
  }
  return parsed.data;
}
