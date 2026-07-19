import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { EmbeddingJobQueryDto } from './dto/embedding-job-query.dto';
import { EmbeddingQueueService } from './embedding-queue.service';

const RESOURCE_TYPE = 'embedding';

/** API quản trị Embedding Pipeline & Vector Indexing (Prompt 04) — chỉ ADMIN */
@ApiTags('admin-embeddings')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class EmbeddingAdminController {
  constructor(
    private readonly queue: EmbeddingQueueService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ---------- Embedding status / Queue monitoring ----------
  @Get('admin/embedding-jobs')
  @ApiOperation({ summary: '[ADMIN] Danh sách job embedding (Queue monitoring)' })
  findJobs(@Query() query: EmbeddingJobQueryDto) {
    return this.queue.findJobs(query);
  }

  @Get('admin/embedding-jobs/metrics')
  @ApiOperation({ summary: '[ADMIN] Metrics: latency/throughput/failure rate/retry/queue depth/dead letter/cost ước tính' })
  metrics() {
    return this.queue.metrics();
  }

  @Get('admin/embedding-jobs/:jobId')
  @ApiOperation({ summary: '[ADMIN] Trạng thái xử lý 1 job embedding' })
  findJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.queue.findJob(jobId);
  }

  // ---------- View embedding versions ----------
  @Get('admin/document-chunks/:chunkId/embeddings')
  @ApiOperation({ summary: '[ADMIN] Xem toàn bộ embedding version của 1 chunk' })
  findVersions(@Param('chunkId', ParseUUIDPipe) chunkId: string) {
    return this.queue.findVersions(chunkId);
  }

  // ---------- Activate / Deactivate embedding version ----------
  @Post('admin/embeddings/:embeddingId/activate')
  @ApiOperation({ summary: '[ADMIN] Kích hoạt 1 embedding version làm bản phục vụ retrieval' })
  async activateVersion(@CurrentUser() user: AuthUser, @Param('embeddingId', ParseUUIDPipe) embeddingId: string) {
    const result = await this.queue.activateVersion(embeddingId);
    void this.auditLog.record('ACTIVATE_EMBEDDING_VERSION', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: embeddingId,
    });
    return result;
  }

  @Post('admin/embeddings/:embeddingId/deactivate')
  @ApiOperation({ summary: '[ADMIN] Bỏ kích hoạt 1 embedding version' })
  async deactivateVersion(@CurrentUser() user: AuthUser, @Param('embeddingId', ParseUUIDPipe) embeddingId: string) {
    const result = await this.queue.deactivateVersion(embeddingId);
    void this.auditLog.record('DEACTIVATE_EMBEDDING_VERSION', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: embeddingId,
    });
    return result;
  }

  // ---------- Re-index (document / version / chunk / all) ----------
  @Post('admin/knowledge-documents/:documentId/reindex')
  @ApiOperation({ summary: '[ADMIN] Re-index toàn bộ 1 tài liệu (version hiện hành) — ?force=true để xóa embedding cũ trước' })
  async reindexDocument(
    @CurrentUser() user: AuthUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('force') force?: string,
  ) {
    const job = await this.queue.reindexDocument(documentId, user.userId, force === 'true');
    void this.auditLog.record('REINDEX_DOCUMENT_EMBEDDINGS', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: documentId,
      metadata: { jobId: job.id, force: force === 'true' },
    });
    return job;
  }

  @Post('admin/knowledge-documents/:documentId/versions/:versionId/reindex')
  @ApiOperation({ summary: '[ADMIN] Re-index 1 version cụ thể' })
  async reindexVersion(
    @CurrentUser() user: AuthUser,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Query('force') force?: string,
  ) {
    const job = await this.queue.reindexVersion(versionId, user.userId, force === 'true');
    void this.auditLog.record('REINDEX_VERSION_EMBEDDINGS', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: versionId,
      metadata: { jobId: job.id, force: force === 'true' },
    });
    return job;
  }

  @Post('admin/document-chunks/:chunkId/reindex')
  @ApiOperation({ summary: '[ADMIN] Re-index 1 chunk duy nhất (xử lý ngay, không qua queue)' })
  async reindexChunk(@CurrentUser() user: AuthUser, @Param('chunkId', ParseUUIDPipe) chunkId: string) {
    const result = await this.queue.reindexChunk(chunkId, user.userId);
    void this.auditLog.record('REINDEX_CHUNK_EMBEDDING', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      resourceId: chunkId,
      metadata: { embeddingId: result.id },
    });
    return result;
  }

  @Post('admin/embeddings/reindex-all')
  @ApiOperation({ summary: '[ADMIN] Re-index TOÀN BỘ tài liệu đang có chunk (model migration hàng loạt)' })
  async reindexAll(@CurrentUser() user: AuthUser) {
    const result = await this.queue.reindexAll(user.userId);
    void this.auditLog.record('REINDEX_ALL_EMBEDDINGS', {
      actorUserId: user.userId,
      resourceType: RESOURCE_TYPE,
      metadata: result,
    });
    return result;
  }

  // ---------- Retry / Cancel ----------
  @Post('admin/embedding-jobs/:jobId/retry')
  @ApiOperation({ summary: '[ADMIN] Retry job embedding đang FAILED' })
  async retry(@CurrentUser() user: AuthUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    const job = await this.queue.retry(jobId);
    void this.auditLog.record('RETRY_EMBEDDING_JOB', {
      actorUserId: user.userId,
      resourceType: 'embedding_job',
      resourceId: jobId,
    });
    return job;
  }

  @Post('admin/embedding-jobs/:jobId/cancel')
  @ApiOperation({ summary: '[ADMIN] Hủy job embedding đang QUEUED/RUNNING' })
  async cancel(@CurrentUser() user: AuthUser, @Param('jobId', ParseUUIDPipe) jobId: string) {
    const job = await this.queue.cancel(jobId);
    void this.auditLog.record('CANCEL_EMBEDDING_JOB', {
      actorUserId: user.userId,
      resourceType: 'embedding_job',
      resourceId: jobId,
    });
    return job;
  }
}
