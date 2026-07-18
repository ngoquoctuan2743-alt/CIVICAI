import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

/** API quản trị tài khoản người dùng — chỉ ADMIN (Dashboard Admin) */
@ApiTags('admin-users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UsersAdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Danh sách tài khoản (search, lọc status/role, phân trang)' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Chi tiết tài khoản' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOneForAdmin(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[ADMIN] Khóa/mở tài khoản' })
  async updateStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const result = await this.usersService.updateStatus(id, dto);
    void this.auditLog.record('UPDATE_USER_STATUS', {
      actorUserId: actor.userId,
      resourceType: 'user',
      resourceId: id,
      metadata: { status: dto.status },
    });
    return result;
  }
}
