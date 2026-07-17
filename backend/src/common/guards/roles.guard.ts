import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../constants/app.constants';
import { Role } from '../enums/role.enum';
import { AppException } from '../exceptions/app.exception';
import { AuthUser } from '../interfaces/auth-user.interface';
import { AppLoggerService } from '../../logger/logger.service';

/**
 * Authorization Guard — phân quyền theo role, đăng ký GLOBAL (chạy SAU AuthGuard).
 *
 * - Route không gắn @Roles() -> cho qua (chỉ cần xác thực).
 * - Route gắn @Roles(...)    -> user phải có ÍT NHẤT MỘT role yêu cầu.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(RolesGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Không khai báo @Roles() -> không yêu cầu phân quyền
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    // Route @Public() nhưng gắn @Roles() là cấu hình sai — từ chối an toàn
    if (!user) {
      throw AppException.unauthorized();
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      this.logger.warn(
        `User ${user.userId} bị từ chối: cần role [${requiredRoles.join(', ')}], có [${user.roles.join(', ')}]`,
      );
      throw AppException.forbidden();
    }
    return true;
  }
}
