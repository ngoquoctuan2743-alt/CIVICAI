import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { LegalQueryDto } from './dto/legal-query.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { LegalService } from './legal.service';

const RESOURCE_TYPE = 'legal_document';

/** API quản trị kho văn bản pháp luật — chỉ ADMIN (Dashboard Admin) */
@ApiTags('admin-legal')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/legal/documents')
export class LegalAdminController {
  constructor(
    private readonly legalService: LegalService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Danh sách văn bản pháp luật' })
  findAll(@Query() query: LegalQueryDto) {
    return this.legalService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Chi tiết văn bản pháp luật' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.legalService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[ADMIN] Tạo văn bản pháp luật mới' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateLegalDocumentDto) {
    const result = await this.legalService.create(dto);
    void this.auditLog.record('CREATE_LEGAL_DOCUMENT', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: result.id,
      metadata: { code: result.code },
    });
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Cập nhật văn bản pháp luật' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    const result = await this.legalService.update(id, dto);
    void this.auditLog.record('UPDATE_LEGAL_DOCUMENT', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Loại văn bản khỏi nguồn trích dẫn AI (status -> HET_HIEU_LUC)' })
  async deactivate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.legalService.deactivate(id);
    void this.auditLog.record('DEACTIVATE_LEGAL_DOCUMENT', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return result;
  }
}
