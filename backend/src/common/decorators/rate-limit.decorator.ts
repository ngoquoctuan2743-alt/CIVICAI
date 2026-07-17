import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY } from '../constants/app.constants';

export interface RateLimitOptions {
  /** Số request tối đa cho phép trong cửa sổ thời gian */
  points: number;
  /** Độ dài cửa sổ thời gian (ms) */
  durationMs: number;
}

/**
 * Ghi đè giới hạn rate-limit mặc định cho một route cụ thể.
 * Dùng cho endpoint nhạy cảm (đăng nhập/đăng ký) cần siết chặt hơn mặc định.
 *
 * @example
 * @RateLimit({ points: 5, durationMs: 60_000 }) // 5 request / phút
 * @Post('login')
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
