import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-code.constants';
import { ChunkProcessingStatus } from '../../database/entities/enums';
import { ChunkProcessingJobEntity } from '../../database/entities/chunk-processing-job.entity';
import { DocumentChunkEntity } from '../../database/entities/document-chunk.entity';
import { KnowledgeDocumentTagEntity } from '../../database/entities/knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from '../../database/entities/knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from '../../database/entities/knowledge-document.entity';
import { ParsingLogEntity } from '../../database/entities/parsing-log.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { EmbeddingQueueService } from '../embedding/embedding-queue.service';
import { ChunkProcessingQueueService } from './chunk-processing-queue.service';
import { WorkerPool } from './worker-pool';

/**
 * Unit test — chỉ kiểm tra logic điều phối (enqueue/retry/cancel/query),
 * KHÔNG spawn worker_thread thật (đó là phạm vi integration test thật với
 * Postgres + file thật, xem chunking-pipeline.api.spec.ts).
 */
describe('ChunkProcessingQueueService (orchestration logic)', () => {
  let service: ChunkProcessingQueueService;

  const jobRepo = {
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'job-1', attempts: 0, maxAttempts: 3, ...x })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };
  const chunkRepo = { findAndCount: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn(), count: jest.fn() };
  const logRepo = { save: jest.fn(), create: jest.fn((x) => x), find: jest.fn() };
  const versionRepo = { findOne: jest.fn() };
  const documentRepo = { findOne: jest.fn() };
  const tagRepo = { find: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  const logger = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const configService = { getOrThrow: jest.fn().mockReturnValue({ uploadDir: './uploads' }) };
  // Mock toàn bộ WorkerPool — test này chỉ kiểm tra logic điều phối, KHÔNG
  // được spawn worker_thread thật (xem lý do @Injectable() ở worker-pool.ts).
  const pool = { execute: jest.fn(), destroy: jest.fn().mockResolvedValue(undefined) };
  // Mock EmbeddingQueueService — hook Prompt 04 (chunk COMPLETED -> enqueue
  // embedding) không được gọi service thật trong unit test điều phối này.
  const embeddingQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    jobRepo.save.mockImplementation((x) => Promise.resolve({ id: 'job-1', attempts: 0, maxAttempts: 3, ...x }));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChunkProcessingQueueService,
        { provide: getRepositoryToken(ChunkProcessingJobEntity), useValue: jobRepo },
        { provide: getRepositoryToken(DocumentChunkEntity), useValue: chunkRepo },
        { provide: getRepositoryToken(ParsingLogEntity), useValue: logRepo },
        { provide: getRepositoryToken(KnowledgeDocumentVersionEntity), useValue: versionRepo },
        { provide: getRepositoryToken(KnowledgeDocumentEntity), useValue: documentRepo },
        { provide: getRepositoryToken(KnowledgeDocumentTagEntity), useValue: tagRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: AppLoggerService, useValue: logger },
        { provide: WorkerPool, useValue: pool },
        { provide: EmbeddingQueueService, useValue: embeddingQueue },
      ],
    }).compile();
    service = moduleRef.get(ChunkProcessingQueueService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('enqueue', () => {
    it('tạo job status QUEUED và trả về', async () => {
      // version/document không tồn tại -> processJob sẽ tự fail nhanh, không ảnh hưởng assertion enqueue() trả đúng job
      versionRepo.findOne.mockResolvedValue(null);
      const job = await service.enqueue('doc-1', 'ver-1', 'user-1');
      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'doc-1', documentVersionId: 'ver-1', status: ChunkProcessingStatus.QUEUED }),
      );
      expect(job.id).toBe('job-1');
    });
  });

  describe('retry', () => {
    it('job không FAILED -> BAD_REQUEST', async () => {
      jobRepo.findOne.mockResolvedValue({ id: 'job-1', status: ChunkProcessingStatus.COMPLETED, attempts: 0, maxAttempts: 3 });
      await expect(service.retry('job-1')).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    });

    it('job FAILED nhưng đã hết số lần thử -> BAD_REQUEST', async () => {
      jobRepo.findOne.mockResolvedValue({ id: 'job-1', status: ChunkProcessingStatus.FAILED, attempts: 3, maxAttempts: 3 });
      await expect(service.retry('job-1')).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    });

    it('job FAILED còn lượt thử -> chuyển RETRYING, tăng attempts', async () => {
      // processJob() chạy nền (từ tick() bên trong retry()) cũng gọi findOne cùng
      // jobId — PHẢI trả object MỚI mỗi lần gọi, không dùng chung 1 reference,
      // nếu không processJob() sẽ mutate ngược lại object mà retry() đã trả về
      // (TypeORM thật luôn trả entity mới mỗi query, không có race này).
      jobRepo.findOne.mockImplementation(async () => ({
        id: 'job-1',
        status: ChunkProcessingStatus.FAILED,
        attempts: 1,
        maxAttempts: 3,
      }));
      versionRepo.findOne.mockResolvedValue(null);
      const result = await service.retry('job-1');
      // retry() trả về job đã cập nhật ngay (không phụ thuộc thứ tự các lần
      // save() khác từ processJob() chạy nền song song — đây là assertion
      // đáng tin cậy hơn là giả định vị trí trong mock.calls).
      expect(result.status).toBe(ChunkProcessingStatus.RETRYING);
      expect(result.attempts).toBe(2);
      const retryingSave = jobRepo.save.mock.calls.find(([arg]) => arg.status === ChunkProcessingStatus.RETRYING);
      expect(retryingSave).toBeDefined();
    });
  });

  describe('cancel', () => {
    it('job không tồn tại -> NOT_FOUND', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel('khong-co')).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
    });

    it('job QUEUED -> chuyển CANCELLED ngay, không cần chờ worker', async () => {
      jobRepo.findOne.mockResolvedValue({ id: 'job-1', status: ChunkProcessingStatus.QUEUED });
      const job = await service.cancel('job-1');
      expect(job.status).toBe(ChunkProcessingStatus.CANCELLED);
    });

    it('job COMPLETED -> không cho hủy (BAD_REQUEST)', async () => {
      jobRepo.findOne.mockResolvedValue({ id: 'job-1', status: ChunkProcessingStatus.COMPLETED });
      await expect(service.cancel('job-1')).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    });
  });

  describe('reparse', () => {
    it('version không thuộc document -> NOT_FOUND, KHÔNG enqueue', async () => {
      versionRepo.findOne.mockResolvedValue(null);
      await expect(service.reparse('doc-1', 'ver-la', 'user-1')).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
      expect(jobRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteChunks', () => {
    it('trả về số dòng đã xóa', async () => {
      chunkRepo.delete.mockResolvedValue({ affected: 5 });
      const result = await service.deleteChunks('ver-1');
      expect(result).toEqual({ deleted: 5 });
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
      chunkRepo.createQueryBuilder.mockReturnValue({ select: jest.fn().mockReturnThis(), getRawOne: rawOne });
      chunkRepo.count.mockResolvedValue(100);
      jobRepo.count.mockResolvedValue(2);

      const result = await service.metrics();
      expect(result).toMatchObject({
        totalChunks: 100,
        parserFailureCount: 2,
      });
      expect(typeof result.avgParsingDurationMs).toBe('number');
    });
  });
});
