import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/app.constants';
import { Role } from '../enums/role.enum';

/**
 * Khai báo danh sách role được phép truy cập route — RolesGuard sẽ kiểm tra.
 *
 * @example
 * @Roles(Role.ADMIN)
 * @Get('admin-only')
 * getAdminData() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
