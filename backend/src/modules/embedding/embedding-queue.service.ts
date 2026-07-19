import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { EmbeddingConfig } from '../../config/configuration';
import { DocumentChunkEntity } from '../../database/entities/document-chunk.entity';
import { EmbeddingJobEntity } from '../../database/entities/embedding-job.entity';
import { EmbeddingEntity } from '../../database/entities/embedding.entity';
import { EmbeddingJobStatus, EmbeddingStatus } from '../../database/entities/enums';
import { AppLoggerService } from '../../logger/logger.service';
import { deterministicEmbeddingId } from './embedding-id.util';
import { computeEmbeddingChecksum, toVectorLiteral, validateEmbeddingVector } from './embedding-validation.util';
import { EmbeddingProviderRegistry } from './providers/embedding-provider.registry';
import { SlidingWindowRateLimiter } from './rate-limiter.util';

/**
 * EmbeddingQueueService — pipeline "READY_CHUNK -> Queue -> Embedding
 * Worker -> Embedding Validation -> Vector Index -> READY_FOR_RETRIEVAL".
 *
 * Queue in-process (không Redis/BullMQ, cùng quyết định như Prompt 03).
 * KHÔNG cần Worker Pool (worker_threads) như Prompt 03 — gọi API embedding
 * là I/O-bound (mạng), không có rủi ro crash native như parse PDF CPU-bound,
 * nên xử lý ngay trên event loop chính, chỉ cần giới hạn concurrency + rate
 * limit là đủ an toàn.
 */
@Injectable()
export class EmbeddingQueueService implements OnModuleDestroy {
  private readonly pending: string[] = [];
  private activeCount = 0;
  private readonly abortControllers = new Map<string, AbortController>();
  private readonly activeJobPromises = new Map<string, Promise<void>>();
  private readonly config: EmbeddingConfig;
  private readonly rateLimiter: SlidingWindowRateLimiter;

  constructor(
    @InjectRepository(EmbeddingJobEntity) private readonly jobRepo: Repository<EmbeddingJobEntity>,
    @InjectRepository(EmbeddingEntity) private readonly embeddingRepo: Repository<EmbeddingEntity>,
    @InjectRepository(DocumentChunkEntity) private readonly chunkRepo: Repository<DocumentChunkEntity>,
    private readonly dataSource: DataSource,
    configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly providerRegistry: EmbeddingProviderRegistry,
  ) {
    this.logger.setContext(EmbeddingQueueService.name);
    this.config = configService.getOrThrow<EmbeddingConfig>('embedding');
    this.rateLimiter = new SlidingWindowRateLimiter(this.config.rateLimitPerMinute);
  }

  /** Đưa 1 document version vào hàng đợi embed — dùng cho hook tự động lẫn reindex thủ công */
  async enqueue(documentId: string, documentVersionId: string, requestedBy: string | null): Promise<EmbeddingJobEntity> {
    const provider = this.providerRegistry.get();
    const job = await this.jobRepo.save(
      this.jobRepo.create({
        documentId,
        documentVersionId,
        embeddingModel: provider.modelName,
        embeddingModelVersion: provider.modelVersion,
        status: EmbeddingJobStatus.QUEUED,
        requestedBy,
      }),
    );
    this.pending.push(job.id);
    this.tick();
    return job;
  }

  /** Reindex 1 version — force=true xóa embedding cũ (model hiện hành) trước khi enqueue lại từ đầu */
  async reindexVersion(documentVersionId: string, requestedBy: string, force = false): Promise<EmbeddingJobEntity> {
    const chunk = await this.chunkRepo.findOne({ where: { documentVersionId } });
    if (!chunk) throw AppException.notFound('Version chưa có chunk nào (chưa parse xong ở Prompt 03)');
    if (force) {
      const provider = this.providerRegistry.get();
      await this.embeddingRepo.delete({
        documentVersionId,
        embeddingModel: provider.modelName,
        embeddingModelVersion: provider.modelVersion,
      });
    }
    return this.enqueue(chunk.documentId, documentVersionId, requestedBy);
  }

  /** Reindex toàn bộ tài liệu — enqueue lại version hiện hành (activeVersionId) */
  async reindexDocument(documentId: string, requestedBy: string, force = false): Promise<EmbeddingJobEntity> {
    const chunk = await this.chunkRepo.findOne({ where: { documentId } });
    if (!chunk) throw AppException.notFound('Tài liệu chưa có chunk nào');
    return this.reindexVersion(chunk.documentVersionId, requestedBy, force);
  }

  /** Reindex 1 chunk duy nhất — xóa embedding (model hiện hành) của riêng chunk đó rồi embed lại ngay (đồng bộ, không qua queue) */
  async reindexChunk(chunkId: string, requestedBy: string): Promise<EmbeddingEntity> {
    const chunk = await this.chunkRepo.findOne({ where: { id: chunkId } });
    if (!chunk) throw AppException.notFound('Không tìm thấy chunk');
    const provider = this.providerRegistry.get();
    await this.embeddingRepo.delete({
      chunkId,
      embeddingModel: provider.modelName,
      embeddingModelVersion: provider.modelVersion,
    });
    await this.rateLimiter.acquire();
    const [vector] = await provider.embedBatch([chunk.content]);
    await this.persistEmbedding(chunk, vector.values, provider.modelName, provider.modelVersion, provider.dimension);
    const saved = await this.embeddingRepo.findOne({
      where: { chunkId, embeddingModel: provider.modelName, embeddingModelVersion: provider.modelVersion },
    });
    if (!saved) throw AppException.internal('Lưu embedding thất bại không rõ lý do');
    void requestedBy; // giữ tham số cho Audit Log ở tầng controller, không dùng trực tiếp ở đây
    return saved;
  }

  /** Reindex TẤT CẢ — enqueue mọi document version đang có chunk (Reindex all) */
  async reindexAll(requestedBy: string): Promise<{ enqueued: number }> {
    const versions: { documentId: string; documentVersionId: string }[] = await this.chunkRepo
      .createQueryBuilder('c')
      .select('c.documentId', 'documentId')
      .addSelect('c.documentVersionId', 'documentVersionId')
      .distinct(true)
      .getRawMany();
    for (const v of versions) {
      await this.enqueue(v.documentId, v.documentVersionId, requestedBy);
    }
    return { enqueued: versions.length };
  }

  async retry(jobId: string): Promise<EmbeddingJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw AppException.notFound('Không tìm thấy job embedding');
    if (job.status !== EmbeddingJobStatus.FAILED) {
      throw AppException.badRequest('Chỉ có thể retry job đang ở trạng thái FAILED (job DEAD_LETTER cần điều tra thủ công)');
    }
    job.status = EmbeddingJobStatus.RETRYING;
    job.attempts += 1;
    job.errorReason = null;
    await this.jobRepo.save(job);
    this.pending.push(job.id);
    this.tick();
    return job;
  }

  async cancel(jobId: string): Promise<EmbeddingJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw AppException.notFound('Không tìm thấy job embedding');
    if (job.status === EmbeddingJobStatus.QUEUED || job.status === EmbeddingJobStatus.RETRYING) {
      const idx = this.pending.indexOf(jobId);
      if (idx >= 0) this.pending.splice(idx, 1);
      job.status = EmbeddingJobStatus.CANCELLED;
      job.completedAt = new Date();
      await this.jobRepo.save(job);
      return job;
    }
    if (job.status === EmbeddingJobStatus.RUNNING) {
      this.abortControllers.get(jobId)?.abort();
      return (await this.jobRepo.findOne({ where: { id: jobId } })) ?? job;
    }
    throw AppException.badRequest(`Không thể hủy job ở trạng thái ${job.status}`);
  }

  /** Kích hoạt 1 embedding version — tự động bỏ active các version KHÁC của CÙNG chunk (chỉ 1 active/chunk) */
  async activateVersion(embeddingId: string): Promise<EmbeddingEntity> {
    const embedding = await this.embeddingRepo.findOne({ where: { id: embeddingId } });
    if (!embedding) throw AppException.notFound('Không tìm thấy embedding version');
    if (embedding.status !== EmbeddingStatus.READY) {
      throw AppException.badRequest('Chỉ có thể kích hoạt embedding ở trạng thái READY');
    }
    await this.embeddingRepo.update({ chunkId: embedding.chunkId }, { isActive: false });
    embedding.isActive = true;
    await this.embeddingRepo.save(embedding);
    return embedding;
  }

  async deactivateVersion(embeddingId: string): Promise<EmbeddingEntity> {
    const embedding = await this.embeddingRepo.findOne({ where: { id: embeddingId } });
    if (!embedding) throw AppException.notFound('Không tìm thấy embedding version');
    embedding.isActive = false;
    await this.embeddingRepo.save(embedding);
    return embedding;
  }

  async findVersions(chunkId: string): Promise<EmbeddingEntity[]> {
    return this.embeddingRepo.find({ where: { chunkId }, order: { createdAt: 'DESC' } });
  }

  async findJobs(query: { documentId?: string; status?: EmbeddingJobStatus; page: number; limit: number }) {
    const qb = this.jobRepo.createQueryBuilder('job').orderBy('job.queuedAt', 'DESC');
    if (query.documentId) qb.andWhere('job.documentId = :documentId', { documentId: query.documentId });
    if (query.status) qb.andWhere('job.status = :status', { status: query.status });
    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  async findJob(jobId: string): Promise<EmbeddingJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw AppException.notFound('Không tìm thấy job embedding');
    return job;
  }

  /**
   * Gọi trực tiếp healthCheck() thật của provider đang cấu hình — dùng cho
   * Demo Mode dashboard hiển thị đúng trạng thái reachable của Gemini
   * Embedding API, không hardcode. healthCheck() đã có sẵn trên interface
   * EmbeddingProvider từ trước, chỉ chưa được expose qua HTTP.
   */
  async providerHealth(): Promise<{ reachable: boolean; latencyMs: number; error: string | null; modelName: string; modelVersion: string }> {
    const provider = this.providerRegistry.get();
    const result = await provider.healthCheck();
    return { ...result, modelName: provider.modelName, modelVersion: provider.modelVersion };
  }

  /**
   * Metrics (Observability) — tính trực tiếp từ dữ liệu đã lưu, không thêm
   * bảng EmbeddingMetric riêng (cùng lý do như metrics() ở Prompt 03).
   * "Estimated embedding cost": Gemini SDK hiện KHÔNG trả tokenCount theo
   * item (đã ghi rõ ở gemini-embedding.provider.ts) nên cost ước tính theo
   * SỐ VECTOR đã tạo (proxy hợp lý khi chưa có token usage thật).
   */
  async metrics() {
    const [avgDuration, totalVectors, failureCount, retryCount, avgBatch, queueDepth, deadLetterCount] = await Promise.all([
      this.jobRepo
        .createQueryBuilder('job')
        .select('AVG(EXTRACT(EPOCH FROM (job.completedAt - job.startedAt)) * 1000)', 'v')
        .where('job.status = :status', { status: EmbeddingJobStatus.COMPLETED })
        .getRawOne<{ v: string | null }>(),
      this.embeddingRepo.count({ where: { status: EmbeddingStatus.READY } }),
      this.jobRepo.count({ where: { status: EmbeddingJobStatus.FAILED } }),
      this.jobRepo.createQueryBuilder('job').select('SUM(job.attempts)', 'v').where('job.attempts > 0').getRawOne<{ v: string | null }>(),
      this.jobRepo
        .createQueryBuilder('job')
        .select('AVG(job.totalChunks)', 'v')
        .where('job.status = :status', { status: EmbeddingJobStatus.COMPLETED })
        .getRawOne<{ v: string | null }>(),
      Promise.resolve(this.pending.length),
      this.jobRepo.count({ where: { status: EmbeddingJobStatus.DEAD_LETTER } }),
    ]);
    const throughput = totalVectors && avgDuration?.v ? totalVectors / (Number(avgDuration.v) / 1000 || 1) : null;
    return {
      avgEmbeddingLatencyMs: avgDuration?.v ? Number(avgDuration.v) : null,
      embeddingThroughputPerSec: throughput,
      totalVectors,
      failureRate: null, // tính ở tầng gọi nếu cần (so với totalJobs) — tránh query thừa ở đây
      parserFailureCount: failureCount,
      totalRetryCount: retryCount?.v ? Number(retryCount.v) : 0,
      avgBatchSize: avgBatch?.v ? Number(avgBatch.v) : null,
      queueDepth,
      deadLetterCount,
      estimatedCostUsd: totalVectors * 0.00001, // proxy đơn giản — điều chỉnh theo bảng giá thật khi có
    };
  }

  private tick(): void {
    while (this.pending.length > 0 && this.activeCount < this.config.maxConcurrency) {
      const jobId = this.pending.shift();
      if (!jobId) break;
      this.activeCount++;
      const promise = this.processJob(jobId).finally(() => {
        this.activeCount--;
        this.activeJobPromises.delete(jobId);
        this.tick();
      });
      this.activeJobPromises.set(jobId, promise);
    }
  }

  private async persistEmbedding(
    chunk: DocumentChunkEntity,
    values: number[],
    modelName: string,
    modelVersion: string,
    dimension: number,
  ): Promise<void> {
    const validation = validateEmbeddingVector(values, dimension);
    const id = deterministicEmbeddingId(chunk.id, modelName, modelVersion);
    const checksum = computeEmbeddingChecksum(chunk.content);

    if (!validation.valid) {
      // Lưu dòng FAILED để giữ dấu vết (Never lose metadata) — không có vector
      await this.dataSource.query(
        `INSERT INTO embeddings (id, chunk_id, document_version_id, embedding_model, embedding_model_version, dimension, checksum, status, is_active, failure_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'FAILED', false, $8, now())
         ON CONFLICT (id) DO NOTHING`,
        [id, chunk.id, chunk.documentVersionId, modelName, modelVersion, dimension, checksum, validation.reason],
      );
      throw new Error(`Vector không hợp lệ cho chunk ${chunk.id}: ${validation.reason}`);
    }

    // Version đầu tiên của chunk này (bất kể model nào) -> tự động active; đổi model sau -> phải activate thủ công
    const existingCount = await this.embeddingRepo.count({ where: { chunkId: chunk.id } });
    const isActive = existingCount === 0;

    await this.dataSource.query(
      `INSERT INTO embeddings (id, chunk_id, document_version_id, embedding_model, embedding_model_version, dimension, checksum, status, is_active, vector, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'READY', $8, $9::vector, now())
       ON CONFLICT (id) DO NOTHING`,
      [id, chunk.id, chunk.documentVersionId, modelName, modelVersion, dimension, checksum, isActive, toVectorLiteral(values)],
    );
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return;

    job.status = EmbeddingJobStatus.RUNNING;
    job.startedAt = new Date();
    await this.jobRepo.save(job);
    const abortController = new AbortController();
    this.abortControllers.set(jobId, abortController);

    try {
      const provider = this.providerRegistry.get();

      // Resume: chỉ lấy chunk CHƯA có embedding READY cho đúng model/version hiện hành
      const pendingChunks = await this.chunkRepo
        .createQueryBuilder('c')
        .where('c.documentVersionId = :versionId', { versionId: job.documentVersionId })
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM embeddings e WHERE e.chunk_id = c.id AND e.embedding_model = :model AND e.embedding_model_version = :modelVersion AND e.status = 'READY')`,
          { model: job.embeddingModel, modelVersion: job.embeddingModelVersion },
        )
        .getMany();

      job.totalChunks = pendingChunks.length;
      await this.jobRepo.save(job);

      let embeddedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < pendingChunks.length; i += this.config.batchSize) {
        if (abortController.signal.aborted) throw new Error('Bị hủy thủ công');
        const batch = pendingChunks.slice(i, i + this.config.batchSize);

        await this.rateLimiter.acquire();
        let vectors;
        try {
          vectors = await provider.embedBatch(batch.map((c) => c.content));
        } catch (error) {
          // Cả batch lỗi (network/quota) -> tính là failed, KHÔNG dừng toàn job (Backpressure/Resilience) —
          // chunk còn lại vẫn thử tiếp, job này sẽ FAILED cuối cùng nếu còn sót nhưng đã ghi tiến độ (Resume)
          failedCount += batch.length;
          this.logger.warn(`embed batch loi (khong lo noi dung): ${(error as Error).message}`);
          continue;
        }

        for (let j = 0; j < batch.length; j++) {
          try {
            await this.persistEmbedding(batch[j], vectors[j].values, provider.modelName, provider.modelVersion, provider.dimension);
            embeddedCount++;
          } catch (error) {
            failedCount++;
            this.logger.warn(`embed chunk ${batch[j].id} loi: ${(error as Error).message}`);
          }
        }
        job.embeddedCount = embeddedCount;
        job.failedCount = failedCount;
        await this.jobRepo.save(job);
      }

      if (failedCount > 0 && embeddedCount === 0 && pendingChunks.length > 0) {
        throw new Error(`Toàn bộ ${failedCount} chunk embed thất bại`);
      }

      job.status = EmbeddingJobStatus.COMPLETED;
      job.completedAt = new Date();
      await this.jobRepo.save(job);
    } catch (error) {
      const wasCancelled = abortController.signal.aborted;
      job.attempts += 1;
      if (wasCancelled) {
        job.status = EmbeddingJobStatus.CANCELLED;
        job.errorReason = 'Bị hủy thủ công';
      } else if (job.attempts >= job.maxAttempts) {
        job.status = EmbeddingJobStatus.DEAD_LETTER;
        job.errorReason = (error as Error).message.slice(0, 2000);
      } else {
        job.status = EmbeddingJobStatus.FAILED;
        job.errorReason = (error as Error).message.slice(0, 2000);
      }
      job.completedAt = new Date();
      try {
        // Bọc riêng — nếu document/version cha đã bị xóa giữa lúc job đang
        // chạy (race hiếm nhưng có thật, vd Admin xóa tài liệu), save() này
        // TỰ NÓ có thể ném lỗi FK. Không được để lọt thành unhandled
        // rejection cấp process — processJob() chạy fire-and-forget từ
        // tick(), không ai await/catch nó ở tầng trên.
        await this.jobRepo.save(job);
      } catch (saveError) {
        this.logger.warn(`Khong the luu trang thai loi cua job ${jobId} (co the document cha da bi xoa): ${(saveError as Error).message}`);
      }
      this.logger.error(`Embedding job ${jobId} ket thuc: ${job.status} - ${job.errorReason}`);
    } finally {
      this.abortControllers.delete(jobId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.pending.length = 0;
    for (const controller of this.abortControllers.values()) controller.abort();
    const pending = [...this.activeJobPromises.values()];
    if (pending.length > 0) {
      await Promise.race([Promise.allSettled(pending), new Promise((r) => setTimeout(r, 5000))]);
    }
  }
}
