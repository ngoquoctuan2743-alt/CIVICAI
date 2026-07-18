import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ChunkProcessingQueueService } from './chunk-processing-queue.service';
import { JobQueryDto } from './dto/job-query.dto';

const RESOURCE_TYPE = 'document_chunk';

/** API quản trị Document Parsing & Chunking Engine (Prompt 03) — chỉ ADMIN */
@ApiTags('admin-chunking')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class ChunkingAdminController {
  constructor(
    private readonly queue: ChunkProcessingQueueService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get('admin/knowledge-documents/:documentId/versions/:versionId/chunks')
  @ApiOperation({ summary: '[ADMIN] Xem chunk đã sinh cho 1 version' })
  findChunks(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.queue.findChunks(versionId, query.page, query.limit);
  }

  @Post('admin/knowledge-documents/:documentId/versions/:versionId/reparse')
  @ApiOperation({ summary: '[ADMIN] Parse lại 1 version (enqueue job mới, không xóa chunk ngay — thay khi job xong)' })
  async reparse(
    @CurrentUser() user: AuthUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    const job = await this.queue.reparse(documentId, versionId, user.userId);
    void this.auditLog.record('REPARSE_KNOWLEDGE_DOCUMENT_VERSION', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: versionId,
      metadata: { jobId: job.id },
    });
    return job;
  }

  @Post('admin/knowledge-documents/:documentId/versions/:versionId/rebuild-chunks')
  @ApiOperation({ summary: '[ADMIN] Xóa ngay toàn bộ chunk hiện có rồi parse lại từ đầu' })
  async rebuild(
    @CurrentUser() user: AuthUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    const deleted = await this.queue.deleteChunks(versionId);
    const job = await this.queue.reparse(documentId, versionId, user.userId);
    void this.auditLog.record('REBUILD_KNOWLEDGE_DOCUMENT_CHUNKS', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: versionId,
      metadata: { jobId: job.id, chunksDeleted: deleted.deleted },
    });
    return { ...deleted, job };
  }

  @Delete('admin/knowledge-documents/:documentId/versions/:versionId/chunks')
  @ApiOperation({ summary: '[ADMIN] Xóa toàn bộ chunk của 1 version (không parse lại)' })
  async deleteChunks(
    @CurrentUser() user: AuthUser,
    @Param('documentId') documentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    const result = await this.queue.deleteChunks(versionId);
    void this.auditLog.record('DELETE_KNOWLEDGE_DOCUMENT_CHUNKS', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: versionId,
      metadata: result,
    });
    return result;
  }

  @Get('admin/chunk-processing-jobs')
  @ApiOperation({ summary: '[ADMIN] Danh sách job xử lý parsing & chunking' })
  findJobs(@Query() query: JobQueryDto) {
    return this.queue.findJobs(query);
  }

  @Get('admin/chunk-processing-jobs/metrics')
  @ApiOperation({ summary: '[ADMIN] Metrics tổng hợp (Observability): duration/chunk count/failures/retry/queue latency' })
  metrics() {
    return this.queue.metrics();
  }

  @Get('admin/chunk-processing-jobs/:jobId')
  @ApiOperation({ summary: '[ADMIN] Trạng thái xử lý 1 job' })
  findJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.queue.findJob(jobId);
  }

  @Get('admin/chunk-processing-jobs/:jobId/logs')
  @ApiOperation({ summary: '[ADMIN] Nhật ký xử lý (parsing logs) của 1 job' })
  findLogs(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.queue.findLogs(jobId);
  }

  @Post('admin/chunk-processing-jobs/:jobId/retry')
  @ApiOperation({ summary: '[ADMIN] Retry job đang FAILED' })
  async retry(@CurrentUser() user: AuthUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    const job = await this.queue.retry(jobId);
    void this.auditLog.record('RETRY_CHUNK_PROCESSING_JOB', {
      actorUserId: user.userId,
      resourceType: 'chunk_processing_job',
      resourceId: jobId,
    });
    return job;
  }

  @Post('admin/chunk-processing-jobs/:jobId/cancel')
  @ApiOperation({ summary: '[ADMIN] Hủy job đang QUEUED/RUNNING' })
  async cancel(@CurrentUser() user: AuthUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    const job = await this.queue.cancel(jobId);
    void this.auditLog.record('CANCEL_CHUNK_PROCESSING_JOB', {
      actorUserId: user.userId,
      resourceType: 'chunk_processing_job',
      resourceId: jobId,
    });
    return job;
  }
}
