import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { ProcedureQueryDto } from './dto/procedure-query.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { ProceduresService } from './procedures.service';

const RESOURCE_TYPE = 'administrative_procedure';

/** API quản trị thủ tục hành chính — chỉ ADMIN (Dashboard Admin) */
@ApiTags('admin-procedures')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/procedures')
export class ProceduresAdminController {
  constructor(
    private readonly proceduresService: ProceduresService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Danh sách thủ tục (gồm cả INACTIVE)' })
  findAll(@Query() query: ProcedureQueryDto) {
    return this.proceduresService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Chi tiết thủ tục' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proceduresService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[ADMIN] Tạo thủ tục hành chính mới' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProcedureDto) {
    const result = await this.proceduresService.create(dto);
    void this.auditLog.record('CREATE_PROCEDURE', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: result.id,
      metadata: { code: result.code },
    });
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Cập nhật thủ tục hành chính' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcedureDto,
  ) {
    const result = await this.proceduresService.update(id, dto);
    void this.auditLog.record('UPDATE_PROCEDURE', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Ẩn thủ tục khỏi tra cứu công khai (status -> INACTIVE)' })
  async deactivate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.proceduresService.deactivate(id);
    void this.auditLog.record('DEACTIVATE_PROCEDURE', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return result;
  }
}
