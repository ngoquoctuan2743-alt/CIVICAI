import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AgencyQueryDto } from './dto/agency-query.dto';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { GovernmentService } from './government.service';

const RESOURCE_TYPE = 'government_agency';

/** API quản trị danh bạ cơ quan nhà nước — chỉ ADMIN (Dashboard Admin) */
@ApiTags('admin-government')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/government/agencies')
export class GovernmentAdminController {
  constructor(
    private readonly governmentService: GovernmentService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Danh sách cơ quan nhà nước' })
  findAll(@Query() query: AgencyQueryDto) {
    return this.governmentService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Chi tiết cơ quan' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.governmentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[ADMIN] Tạo cơ quan nhà nước mới' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgencyDto) {
    const result = await this.governmentService.create(dto);
    void this.auditLog.record('CREATE_AGENCY', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: result.id,
      metadata: { code: result.code },
    });
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Cập nhật cơ quan nhà nước' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgencyDto,
  ) {
    const result = await this.governmentService.update(id, dto);
    void this.auditLog.record('UPDATE_AGENCY', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Xóa cơ quan nhà nước (chặn nếu đang được tham chiếu)' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.governmentService.remove(id);
    void this.auditLog.record('DELETE_AGENCY', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return result;
  }
}
