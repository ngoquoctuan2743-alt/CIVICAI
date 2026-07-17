import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../constants/app.constants';
import { RequestContext } from '../context/request-context';
import { AppException } from '../exceptions/app.exception';
import { AuthUser } from '../interfaces/auth-user.interface';
import { AppLoggerService } from '../../logger/logger.service';

/** Payload chuẩn của access token do AuthService phát hành */
interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

/**
 * Authentication Guard — xác thực JWT, đăng ký GLOBAL.
 *
 * Nguyên tắc "secure by default":
 * - Route gắn @Public() -> cho qua, không xác thực.
 * - Route còn lại       -> bắt buộc có Bearer access token hợp lệ;
 *   verify thành công thì gắn request.user (AuthUser) + RequestContext.userId.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Route @Public() được bỏ qua xác thực
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw AppException.unauthorized('Thiếu access token (header Authorization: Bearer ...)');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const user: AuthUser = {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles ?? [],
      };
      request.user = user;

      // Gắn userId vào RequestContext để logger/audit dùng chung
      const ctx = RequestContext.get();
      if (ctx) {
        ctx.userId = user.userId;
      }
      return true;
    } catch {
      // Token sai chữ ký / hết hạn / sai định dạng — không lộ chi tiết lý do
      throw AppException.unauthorized('Access token không hợp lệ hoặc đã hết hạn');
    }
  }

  /** Đọc token từ header `Authorization: Bearer <token>` */
  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
