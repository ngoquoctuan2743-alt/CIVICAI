import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { KnowledgeDocumentQueryDto } from './dto/knowledge-document-query.dto';
import { UploadKnowledgeDocumentDto } from './dto/upload-knowledge-document.dto';
import { KnowledgeDocumentsService } from './knowledge-documents.service';

const RESOURCE_TYPE = 'knowledge_document';
const MAX_BULK_FILES = 20;

/** API quản trị Document Ingestion Pipeline — nạp tài liệu vào kho tri thức RAG (chỉ ADMIN) */
@ApiTags('admin-knowledge-documents')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/knowledge-documents')
export class KnowledgeDocumentsAdminController {
  constructor(
    private readonly knowledgeDocumentsService: KnowledgeDocumentsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Danh sách tài liệu kho tri thức — search/lọc/phân trang' })
  findAll(@Query() query: KnowledgeDocumentQueryDto) {
    return this.knowledgeDocumentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Chi tiết tài liệu kèm lịch sử version' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeDocumentsService.findOne(id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN] Tải lên 1 tài liệu mới (PDF/DOCX/TXT/MD/HTML)' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadOne(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadKnowledgeDocumentDto,
  ) {
    const result = await this.knowledgeDocumentsService.uploadOne(user.userId, file, dto);
    void this.auditLog.record('UPLOAD_KNOWLEDGE_DOCUMENT', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: result.id,
      metadata: { title: result.title, category: result.category },
    });
    return result;
  }

  @Post('bulk')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN] Tải lên nhiều tài liệu cùng lúc (tối đa 20 file/lượt)' })
  @UseInterceptors(FilesInterceptor('files', MAX_BULK_FILES, { storage: memoryStorage() }))
  async uploadBulk(
    @CurrentUser() user: AuthUser,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadKnowledgeDocumentDto,
  ) {
    const results = await this.knowledgeDocumentsService.uploadBulk(user.userId, files, dto);
    void this.auditLog.record('BULK_UPLOAD_KNOWLEDGE_DOCUMENT', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      metadata: {
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
    return results;
  }

  @Post(':id/versions')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN] Thêm version mới cho tài liệu đã có (chưa tự kích hoạt)' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadNewVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.knowledgeDocumentsService.uploadNewVersion(user.userId, id, file);
    void this.auditLog.record('UPLOAD_KNOWLEDGE_DOCUMENT_VERSION', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
      metadata: { versionId: result.id, versionNumber: result.versionNumber },
    });
    return result;
  }

  @Post(':id/versions/:versionId/activate')
  @ApiOperation({ summary: '[ADMIN] Kích hoạt 1 version làm bản hiện hành của tài liệu' })
  async activateVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    const result = await this.knowledgeDocumentsService.activateVersion(user.userId, id, versionId);
    void this.auditLog.record('ACTIVATE_KNOWLEDGE_DOCUMENT_VERSION', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
      metadata: { versionId },
    });
    return result;
  }

  @Post(':id/versions/:versionId/deactivate')
  @ApiOperation({ summary: '[ADMIN] Bỏ kích hoạt version (nếu đang là bản hiện hành)' })
  async deactivateVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    const result = await this.knowledgeDocumentsService.deactivateVersion(user.userId, id, versionId);
    void this.auditLog.record('DEACTIVATE_KNOWLEDGE_DOCUMENT_VERSION', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
      metadata: { versionId },
    });
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: '[ADMIN] Xóa mềm tài liệu (giữ nguyên metadata + version, ẩn khỏi tra cứu)' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.knowledgeDocumentsService.remove(id);
    void this.auditLog.record('DELETE_KNOWLEDGE_DOCUMENT', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return { id, deleted: true };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: '[ADMIN] Khôi phục tài liệu đã xóa mềm' })
  async restore(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.knowledgeDocumentsService.restore(id);
    void this.auditLog.record('RESTORE_KNOWLEDGE_DOCUMENT', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: id,
    });
    return result;
  }
}
