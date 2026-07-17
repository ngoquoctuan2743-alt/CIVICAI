import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * Lấy người dùng đã xác thực trong controller:
 *   handler(@CurrentUser() user: AuthUser) { ... }
 * Chỉ dùng trên route KHÔNG gắn @Public() (AuthGuard đảm bảo user tồn tại).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    return request.user;
  },
);
