import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DEFAULT_RATE_LIMIT, RATE_LIMIT_KEY } from '../constants/app.constants';
import { RateLimitOptions } from '../decorators/rate-limit.decorator';
import { AppException } from '../exceptions/app.exception';

/**
 * Rate Limit Guard — in-memory sliding window theo (IP + route), đăng ký GLOBAL.
 *
 * Mặc định 100 request/phút; route nhạy cảm (login/register) tự ghi đè
 * bằng @RateLimit() chặt hơn. Đơn instance — phù hợp demo, không phân tán.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  /** key "ip:route" -> danh sách timestamp các request gần đây */
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? DEFAULT_RATE_LIMIT;

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.ip}:${request.method}:${request.route?.path ?? request.path}`;
    const now = Date.now();
    const windowStart = now - options.durationMs;

    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= options.points) {
      throw AppException.tooManyRequests(
        `Quá giới hạn ${options.points} yêu cầu / ${options.durationMs / 1000}s. Vui lòng thử lại sau.`,
      );
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
