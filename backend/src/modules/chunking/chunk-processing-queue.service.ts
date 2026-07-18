import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { DataSource, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { StorageConfig } from '../../config/configuration';
import { ChunkProcessingStatus, ParsingLogLevel } from '../../database/entities/enums';
import { ChunkProcessingJobEntity } from '../../database/entities/chunk-processing-job.entity';
import { DocumentChunkEntity } from '../../database/entities/document-chunk.entity';
import { KnowledgeDocumentTagEntity } from '../../database/entities/knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from '../../database/entities/knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from '../../database/entities/knowledge-document.entity';
import { ParsingLogEntity } from '../../database/entities/parsing-log.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { deterministicChunkId } from './chunk-id.util';
import { DEFAULT_CHUNKING_CONFIG } from './chunking.util';
import { computeChunkChecksum } from './normalization.util';
import type { ParsingWorkerError, ParsingWorkerInput, ParsingWorkerOutput } from './parsing.worker.mjs';

const MAX_CONCURRENCY = 2;
const JOB_TIMEOUT_MS = 60_000;
const WORKER_MAX_OLD_GEN_MB = 512;

/**
 * ChunkProcessingQueueService — hàng đợi xử lý parsing & chunking BẤT ĐỒNG BỘ
 * (Background Processing). Chạy IN-PROCESS (không Redis/BullMQ — dự án chưa
 * có hạ tầng đó, xem quyết định đã nêu ở đầu Prompt 03), nhưng TRẠNG THÁI
 * job luôn ghi Postgres (`chunk_processing_jobs`) nên không mất thông tin
 * khi restart — chỉ mất tiến trình job đang RUNNING lúc restart (job đó cần
 * retry thủ công), đây là giới hạn đã biết, ghi rõ để không hiểu nhầm là
 * durable 100%.
 */
@Injectable()
export class ChunkProcessingQueueService implements OnModuleDestroy {
  private readonly storage: StorageConfig;
  private readonly pending: string[] = [];
  private activeCount = 0;
  private readonly activeWorkers = new Map<string, Worker>();
  private readonly cancelledJobIds = new Set<string>();
  /** Promise xử lý job đang chạy — onModuleDestroy PHẢI chờ hết trước khi cho phép app đóng kết nối DB */
  private readonly activeJobPromises = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(ChunkProcessingJobEntity)
    private readonly jobRepo: Repository<ChunkProcessingJobEntity>,
    @InjectRepository(DocumentChunkEntity)
    private readonly chunkRepo: Repository<DocumentChunkEntity>,
    @InjectRepository(ParsingLogEntity)
    private readonly logRepo: Repository<ParsingLogEntity>,
    @InjectRepository(KnowledgeDocumentVersionEntity)
    private readonly versionRepo: Repository<KnowledgeDocumentVersionEntity>,
    @InjectRepository(KnowledgeDocumentEntity)
    private readonly documentRepo: Repository<KnowledgeDocumentEntity>,
    @InjectRepository(KnowledgeDocumentTagEntity)
    private readonly tagRepo: Repository<KnowledgeDocumentTagEntity>,
    private readonly dataSource: DataSource,
    configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ChunkProcessingQueueService.name);
    this.storage = configService.getOrThrow<StorageConfig>('storage');
  }

  /** Đưa 1 document version vào hàng đợi xử lý — gọi tự động khi upload (Prompt 02 hook) hoặc thủ công (reparse) */
  async enqueue(documentId: string, documentVersionId: string, requestedBy: string | null): Promise<ChunkProcessingJobEntity> {
    const job = await this.jobRepo.save(
      this.jobRepo.create({
        documentId,
        documentVersionId,
        status: ChunkProcessingStatus.QUEUED,
        requestedBy,
      }),
    );
    this.pending.push(job.id);
    this.tick();
    return job;
  }

  /** Reparse thủ công (Admin API) — validate version thuộc đúng document trước khi enqueue */
  async reparse(documentId: string, documentVersionId: string, requestedBy: string): Promise<ChunkProcessingJobEntity> {
    const version = await this.versionRepo.findOne({ where: { id: documentVersionId, documentId } });
    if (!version) throw AppException.notFound('Không tìm thấy version thuộc tài liệu này');
    return this.enqueue(documentId, documentVersionId, requestedBy);
  }

  async retry(jobId: string): Promise<ChunkProcessingJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw AppException.notFound('Không tìm thấy job xử lý');
    if (job.status !== ChunkProcessingStatus.FAILED) {
      throw AppException.badRequest('Chỉ có thể retry job đang ở trạng thái FAILED');
    }
    if (job.attempts >= job.maxAttempts) {
      throw AppException.badRequest(`Job đã đạt số lần thử tối đa (${job.maxAttempts})`);
    }
    job.status = ChunkProcessingStatus.RETRYING;
    job.attempts += 1;
    job.errorReason = null;
    await this.jobRepo.save(job);
    this.pending.push(job.id);
    this.tick();
    return job;
  }

  async cancel(jobId: string): Promise<ChunkProcessingJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw AppException.notFound('Không tìm thấy job xử lý');
    if (job.status === ChunkProcessingStatus.QUEUED || job.status === ChunkProcessingStatus.RETRYING) {
      const idx = this.pending.indexOf(jobId);
      if (idx >= 0) this.pending.splice(idx, 1);
      job.status = ChunkProcessingStatus.CANCELLED;
      job.completedAt = new Date();
      await this.jobRepo.save(job);
      return job;
    }
    if (job.status === ChunkProcessingStatus.RUNNING) {
      this.cancelledJobIds.add(jobId);
      const worker = this.activeWorkers.get(jobId);
      await worker?.terminate();
      // status thật sự chuyển CANCELLED trong catch handler của processJob() khi worker bị terminate
      return (await this.jobRepo.findOne({ where: { id: jobId } })) ?? job;
    }
    throw AppException.badRequest(`Không thể hủy job ở trạng thái ${job.status}`);
  }

  /** Xem chunk của 1 version — có phân trang */
  async findChunks(documentVersionId: string, page: number, limit: number) {
    const [items, total] = await this.chunkRepo.findAndCount({
      where: { documentVersionId },
      order: { chunkIndex: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  /** Xóa toàn bộ chunk của 1 version (KHÔNG tự động reparse — dùng khi cần dọn sạch trước khi rebuild) */
  async deleteChunks(documentVersionId: string): Promise<{ deleted: number }> {
    const result = await this.chunkRepo.delete({ documentVersionId });
    return { deleted: result.affected ?? 0 };
  }

  /** Danh sách job — lọc theo document/version/status, phân trang */
  async findJobs(query: { documentId?: string; documentVersionId?: string; status?: ChunkProcessingStatus; page: number; limit: number }) {
    const qb = this.jobRepo.createQueryBuilder('job').orderBy('job.queuedAt', 'DESC');
    if (query.documentId) qb.andWhere('job.documentId = :documentId', { documentId: query.documentId });
    if (query.documentVersionId) qb.andWhere('job.documentVersionId = :documentVersionId', { documentVersionId: query.documentVersionId });
    if (query.status) qb.andWhere('job.status = :status', { status: query.status });
    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  async findJob(jobId: string): Promise<ChunkProcessingJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw AppException.notFound('Không tìm thấy job xử lý');
    return job;
  }

  /** Nhật ký xử lý (Observability) theo job */
  async findLogs(jobId: string): Promise<ParsingLogEntity[]> {
    return this.logRepo.find({ where: { jobId }, order: { createdAt: 'ASC' } });
  }

  /**
   * Metrics tổng hợp (Observability) — tính trực tiếp từ dữ liệu đã lưu
   * (job/chunk), không cần hạ tầng metrics riêng (Prometheus...) ở quy mô
   * hiện tại — đúng tinh thần "không thêm hạ tầng khi chưa cần" của dự án.
   */
  async metrics() {
    const [avgDuration, totalChunks, avgChunkSize, failureCount, retryCount, avgQueueLatency] = await Promise.all([
      this.jobRepo
        .createQueryBuilder('job')
        .select('AVG(job.durationMs)', 'v')
        .where('job.status = :status', { status: ChunkProcessingStatus.COMPLETED })
        .getRawOne<{ v: string | null }>(),
      this.chunkRepo.count(),
      this.chunkRepo.createQueryBuilder('c').select('AVG(LENGTH(c.content))', 'v').getRawOne<{ v: string | null }>(),
      this.jobRepo.count({ where: { status: ChunkProcessingStatus.FAILED } }),
      this.jobRepo
        .createQueryBuilder('job')
        .select('SUM(job.attempts)', 'v')
        .where('job.attempts > 0')
        .getRawOne<{ v: string | null }>(),
      this.jobRepo
        .createQueryBuilder('job')
        .select('AVG(EXTRACT(EPOCH FROM (job.startedAt - job.queuedAt)) * 1000)', 'v')
        .where('job.startedAt IS NOT NULL')
        .getRawOne<{ v: string | null }>(),
    ]);
    return {
      avgParsingDurationMs: avgDuration?.v ? Number(avgDuration.v) : null,
      totalChunks,
      avgChunkSizeChars: avgChunkSize?.v ? Number(avgChunkSize.v) : null,
      parserFailureCount: failureCount,
      totalRetryCount: retryCount?.v ? Number(retryCount.v) : 0,
      avgQueueLatencyMs: avgQueueLatency?.v ? Number(avgQueueLatency.v) : null,
    };
  }

  private tick(): void {
    while (this.pending.length > 0 && this.activeCount < MAX_CONCURRENCY) {
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

  private async log(jobId: string, level: ParsingLogLevel, message: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.logRepo.save(this.logRepo.create({ jobId, level, message, metadata: metadata ?? null }));
    } catch (error) {
      this.logger.warn(`Khong ghi duoc parsing log: ${(error as Error).message}`);
    }
  }

  /**
   * Worker LUÔN chạy bản đã biên dịch trong dist/ — kể cả khi app chính
   * đang chạy qua ts-jest (dev/test). Lý do: từng thử "chạy thẳng .ts qua
   * ts-node/register bên trong worker_thread" — gây Access Violation cấp
   * native khi spawn worker thứ 2 trở đi trong cùng 1 tiến trình Jest (đã
   * tái hiện độc lập). Rồi thử "Node type-stripping gốc + .mts" — hết
   * crash nhưng Node không tự resolve specifier `.js` về file `.ts` cùng
   * tên khi chạy chưa qua compile (đó là quy ước riêng của TypeScript, không
   * phải Node runtime) -> "Cannot find module". Giải pháp bền vững nhất:
   * worker luôn nạp file .mjs thật đã build — vừa tránh 2 lỗi trên, vừa đảm
   * bảo test chạy đúng artifact mà production dùng. Yêu cầu: `dist/` phải
   * được build trước khi test (`pretest` script trong package.json).
   */
  private resolveWorkerScript(): { path: string; execArgv: string[] } {
    return { path: join(process.cwd(), 'dist', 'modules', 'chunking', 'parsing.worker.mjs'), execArgv: [] };
  }

  private async runWorker(input: ParsingWorkerInput, jobId: string): Promise<ParsingWorkerOutput> {
    const { path, execArgv } = this.resolveWorkerScript();
    return new Promise<ParsingWorkerOutput>((resolvePromise, reject) => {
      const worker = new Worker(path, {
        workerData: input,
        execArgv,
        resourceLimits: { maxOldGenerationSizeMb: WORKER_MAX_OLD_GEN_MB },
      });
      this.activeWorkers.set(jobId, worker);

      const timeout = setTimeout(() => {
        void worker.terminate();
        reject(new Error(`Parsing vượt quá thời gian tối đa ${JOB_TIMEOUT_MS}ms`));
      }, JOB_TIMEOUT_MS);

      worker.once('message', (message: ParsingWorkerOutput | ParsingWorkerError) => {
        clearTimeout(timeout);
        if (message.ok) resolvePromise(message);
        else reject(new Error(message.error));
      });
      worker.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      worker.once('exit', (code) => {
        clearTimeout(timeout);
        this.activeWorkers.delete(jobId);
        if (code !== 0 && !this.cancelledJobIds.has(jobId)) {
          reject(new Error(`Worker thoát bất thường (mã ${code}) — có thể do vượt giới hạn bộ nhớ ${WORKER_MAX_OLD_GEN_MB}MB`));
        }
      });
    });
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return;

    job.status = ChunkProcessingStatus.RUNNING;
    job.startedAt = new Date();
    await this.jobRepo.save(job);
    await this.log(jobId, ParsingLogLevel.INFO, 'Bắt đầu xử lý');
    const startedAt = Date.now();

    try {
      const version = await this.versionRepo.findOne({ where: { id: job.documentVersionId } });
      const document = await this.documentRepo.findOne({ where: { id: job.documentId } });
      if (!version || !document) throw new Error('Document hoặc version không còn tồn tại');

      const fileBuffer = await readFile(join(this.storage.uploadDir, version.storageKey));
      const tags = await this.tagRepo.find({ where: { documentId: job.documentId } });

      const result = await this.runWorker(
        { fileBase64: fileBuffer.toString('base64'), fileName: version.fileName, config: DEFAULT_CHUNKING_CONFIG },
        jobId,
      );

      for (const warning of result.warnings) {
        await this.log(jobId, ParsingLogLevel.WARN, warning);
      }
      if (result.duplicatesSkipped > 0) {
        await this.log(jobId, ParsingLogLevel.INFO, `Bỏ qua ${result.duplicatesSkipped} chunk trùng lặp (dedup checksum)`);
      }

      // Ghi chunk trong 1 transaction — xóa chunk cũ của version + insert chunk mới,
      // KHÔNG BAO GIỜ để lại chunk nửa vời (Never leave partial chunks).
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(DocumentChunkEntity, { documentVersionId: job.documentVersionId });
        const rows = result.chunks.map((c, index) =>
          manager.create(DocumentChunkEntity, {
            id: deterministicChunkId(job.documentVersionId, index),
            documentId: job.documentId,
            documentVersionId: job.documentVersionId,
            chunkIndex: index,
            content: c.content,
            pageNumber: c.pageNumber,
            sectionTitle: c.sectionTitle,
            headingPath: c.headingPath,
            charStart: c.charStart,
            charEnd: c.charEnd,
            wordCount: c.content.split(/\s+/).filter(Boolean).length,
            language: document.language,
            sourceType: 'KNOWLEDGE_DOCUMENT',
            category: document.category,
            agencyId: document.agencyId,
            tags: tags.map((t) => t.tagName),
            checksum: computeChunkChecksum(c.content),
          }),
        );
        if (rows.length > 0) await manager.save(DocumentChunkEntity, rows);
      });

      job.status = ChunkProcessingStatus.COMPLETED;
      job.chunksProduced = result.chunks.length;
      job.durationMs = Date.now() - startedAt;
      job.completedAt = new Date();
      await this.jobRepo.save(job);
      await this.log(jobId, ParsingLogLevel.INFO, `Hoàn thành: ${result.chunks.length} chunk`, {
        chunksProduced: result.chunks.length,
        durationMs: job.durationMs,
      });
    } catch (error) {
      const wasCancelled = this.cancelledJobIds.has(jobId);
      this.cancelledJobIds.delete(jobId);
      job.status = wasCancelled ? ChunkProcessingStatus.CANCELLED : ChunkProcessingStatus.FAILED;
      job.errorReason = wasCancelled ? 'Bị hủy thủ công' : (error as Error).message.slice(0, 2000);
      job.durationMs = Date.now() - startedAt;
      job.completedAt = new Date();
      await this.jobRepo.save(job);
      await this.log(jobId, ParsingLogLevel.ERROR, job.errorReason ?? 'Lỗi không xác định');
      this.logger.error(`Job ${jobId} that bai: ${job.errorReason}`);
    } finally {
      this.activeWorkers.delete(jobId);
    }
  }

  /** Dọn dẹp worker đang chạy khi ứng dụng tắt (test teardown / graceful shutdown) — tránh treo tiến trình */
  async onModuleDestroy(): Promise<void> {
    this.pending.length = 0;
    await Promise.all([...this.activeWorkers.values()].map((w) => w.terminate()));
    // Chờ processJob() ghi xong trạng thái CANCELLED/FAILED vào DB trước khi
    // Nest tiếp tục đóng connection pool — nếu không, save() sau đó sẽ ném
    // "Connection terminated" (đã xác nhận thật khi test). Có timeout an
    // toàn để không treo shutdown vô hạn nếu có lỗi bất thường.
    const pending = [...this.activeJobPromises.values()];
    if (pending.length > 0) {
      await Promise.race([Promise.allSettled(pending), new Promise((r) => setTimeout(r, 5000))]);
    }
  }
}
