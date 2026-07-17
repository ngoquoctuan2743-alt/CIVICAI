/** Hằng số cấu hình chung của Frontend */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3100/api/v1';

/** Key lưu token trong localStorage */
export const ACCESS_TOKEN_KEY = 'vaic_access_token';
export const REFRESH_TOKEN_KEY = 'vaic_refresh_token';
export const USER_KEY = 'vaic_user';
