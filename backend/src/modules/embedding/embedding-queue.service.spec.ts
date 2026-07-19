import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-code.constants';
import { DocumentChunkEntity } from '../../database/entities/document-chunk.entity';
import { EmbeddingJobEntity } from '../../database/entities/embedding-job.entity';
import { EmbeddingEntity } from '../../database/entities/embedding.entity';
import { EmbeddingJobStatus, EmbeddingStatus } from '../../database/entities/enums';
import { AppLoggerService } from '../../logger/logger.service';
import { EmbeddingQueueService } from './embedding-queue.service';
import { EmbeddingProviderRegistry } from './providers/embedding-provider.registry';

/**
 * Unit test — chỉ kiểm tra logic điều phối (enqueue/retry/cancel/activate/
 * reindex/metrics), KHÔNG gọi API embedding thật (đó là phạm vi integration
 * test thật với Postgres + Gemini API, xem embedding-pipeline.api.spec.ts).
 */
describe('EmbeddingQueueService (orchestration logic)', () => {
  let service: EmbeddingQueueService;

  const jobRepo = {
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'job-1', attempts: 0, maxAttempts: 3, ...x })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };
  const embeddingRepo = {
    count: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn((x) => Promise.resolve(x)),
  };
  const chunkRepo = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
  const dataSource = { query: jest.fn() };
  const logger = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue({ batchSize: 20, maxConcurrency: 2, rateLimitPerMinute: 6000, maxAttempts: 3 }),
  };
  // Mock toàn bộ EmbeddingProviderRegistry — test này chỉ kiểm tra logic điều
  // phối, KHÔNG được gọi API embedding thật.
  const provider = {
    modelName: 'gemini',
    modelVersion: 'gemini-embedding-001',
    dimension: 768,
    embedBatch: jest.fn(),
    healthCheck: jest.fn(),
  };
  const providerRegistry = { get: jest.fn().mockReturnValue(provider) };

  beforeEach(async () => {
    jest.clearAllMocks();
    providerRegistry.get.mockReturnValue(provider);
    jobRepo.save.mockImplementation((x) => Promise.resolve({ id: 'job-1', attempts: 0, maxAttempts: 3, ...x }));
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmbeddingQueueService,
        { provide: getRepositoryToken(EmbeddingJobEntity), useValue: jobRepo },
        { provide: getRepositoryToken(EmbeddingEntity), useValue: embeddingRepo },
        { provide: getRepositoryToken(DocumentChunkEntity), useValue: chunkRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: AppLoggerService, useValue: logger },
        { provide: EmbeddingProviderRegistry, useValue: providerRegistry },
      ],
    }).compile();
    service = moduleRef.get(EmbeddingQueueService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('enqueue', () => {
    it('tạo job status QUEUED gắn đúng model/version của provider hiện hành', async () => {
      const job = await service.enqueue('doc-1', 'ver-1', 'user-1');
      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-1',
          documentVersionId: 'ver-1',
          embeddingModel: 'gemini',
          embeddingModelVersion: 'gemini-embedding-001',
          status: EmbeddingJobStatus.QUEUED,
        }),
      );
      expect(job.id).toBe('job-1');
    });
  });

  describe('reindexVersion', () => {
    it('version chưa có chunk nào -> NOT_FOUND', async () => {
      chunkRepo.findOne.mockResolvedValue(null);
      await expect(service.reindexVersion('ver-la', 'user-1')).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
    });

    it('force=true -> xóa embedding cũ của model hiện hành trước khi enqueue lại', async () => {
      chunkRepo.findOne.mockResolvedValue({ id: 'chunk-1', documentId: 'doc-1', documentVersionId: 'ver-1' });
      await service.reindexVersion('ver-1', 'user-1', true);
      expect(embeddingRepo.delete).toHaveBeenCalledWith({
        documentVersionId: 'ver-1',
        embeddingModel: 'gemini',
        embeddingModelVersion: 'gemini-embedding-001',
      });
      expect(jobRepo.create).toHaveBeenCalledWith(expect.objectContaining({ documentVersionId: 'ver-1' }));
    });
  });

  describe('reindexDocument', () => {
    it('document chưa có chunk nào -> NOT_FOUND', async () => {
      chunkRepo.findOne.mockResolvedValue(null);
      await expect(service.reindexDocument('doc-la', 'user-1')).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
    });
  });

  describe('reindexChunk', () => {
    it('chunk không tồn tại -> NOT_FOUND', async () => {
      chunkRepo.findOne.mockResolvedValue(null);
      await expect(service.reindexChunk('chunk-la', 'user-1')).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
    });
  });

  describe('retry', () => {
    it('job không tồn tại -> NOT_FOUND', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.retry('job-la')).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
    });

    it('job không FAILED -> BAD_REQUEST', async () => {
      jobRepo.findOne.mockResolvedValue({ id: 'job-1', status: EmbeddingJobStatus.COMPLETED, attempts: 0, maxAttempts: 3 });
      await expect(service.retry('job-1')).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    });

    it('job FAILED -> chuyển RETRYING, tăng attempts', async () => {
      jobRepo.findOne.mockImplementation(async () => ({
        id: 'job-1',
        status: EmbeddingJobStatus.FAILED,
        attempts: 1,
        maxAttempts: 3,
        documentVersionId: 'ver-1',
        embeddingModel: 'gemini',
        embeddingModelVersion: 'gemini-embedding-001',
      }));
      chunkRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });
      const result = await service.retry('job-1');
      expect(result.status).toBe(EmbeddingJobStatus.RETRYING);
      expect(result.attempts).toBe(2);
    });
  });

  describe('cancel', () => {
    it('job không tồn tại -> NOT_FOUND', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel('khong-co')).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
    });

    it('job QUEUED -> chuyển CANCELLED ngay', async () => {
      jobRepo.findOne.mockResolvedValue({ id: 'job-1', status: EmbeddingJobStatus.QUEUED });
      const job = await service.cancel('job-1');
      expect(job.status).toBe(EmbeddingJobStatus.CANCELLED);
    });

    it('job COMPLETED -> không cho hủy (BAD_REQUEST)', async () => {
      jobRepo.findOne.mockResolvedValue({ id: 'job-1', status: EmbeddingJobStatus.COMPLETED });
      await expect(service.cancel('job-1')).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    });
  });

  describe('activateVersion', () => {
    it('embedding không tồn tại -> NOT_FOUND', async () => {
      embeddingRepo.findOne.mockResolvedValue(null);
      await expect(service.activateVersion('emb-la')).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
    });

    it('embedding không READY -> BAD_REQUEST', async () => {
      embeddingRepo.findOne.mockResolvedValue({ id: 'emb-1', status: EmbeddingStatus.PENDING, chunkId: 'chunk-1' });
      await expect(service.activateVersion('emb-1')).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    });

    it('embedding READY -> bỏ active các version khác của cùng chunk trước, rồi active dòng này', async () => {
      embeddingRepo.findOne.mockResolvedValue({ id: 'emb-1', status: EmbeddingStatus.READY, chunkId: 'chunk-1', isActive: false });
      const result = await service.activateVersion('emb-1');
      expect(embeddingRepo.update).toHaveBeenCalledWith({ chunkId: 'chunk-1' }, { isActive: false });
      expect(result.isActive).toBe(true);
    });
  });

  describe('metrics', () => {
    it('gọi đủ query tổng hợp và trả cấu trúc đúng', async () => {
      const rawOne = jest.fn().mockResolvedValue({ v: '42' });
      jobRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: rawOne,
      });
      embeddingRepo.count.mockResolvedValue(100);
      jobRepo.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const result = await service.metrics();
      expect(result).toMatchObject({ totalVectors: 100, parserFailureCount: 2, deadLetterCount: 1 });
      expect(typeof result.estimatedCostUsd).toBe('number');
    });
  });
});
