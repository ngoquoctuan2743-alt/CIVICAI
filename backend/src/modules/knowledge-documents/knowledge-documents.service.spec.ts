import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ErrorCode } from '../../common/constants/error-code.constants';
import * as documentUploadUtil from '../../common/utils/document-upload.util';
import {
  KnowledgeDocumentCategory,
  KnowledgeDocumentVersionStatus,
} from '../../database/entities/enums';
import { KnowledgeDocumentTagEntity } from '../../database/entities/knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from '../../database/entities/knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from '../../database/entities/knowledge-document.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { ChunkProcessingQueueService } from '../chunking/chunk-processing-queue.service';
import { KnowledgeDocumentsService } from './knowledge-documents.service';

jest.mock('../../common/utils/document-upload.util');

/** Unit test KnowledgeDocumentsService — repo mock, util file I/O mock (không đụng đĩa thật) */
describe('KnowledgeDocumentsService', () => {
  let service: KnowledgeDocumentsService;

  const fakeFile = { originalname: 'luat-cu-tru.pdf', mimetype: 'application/pdf', size: 1024, buffer: Buffer.from('%PDF-1.4 fake') } as Express.Multer.File;

  const documentRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const versionRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const tagRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
  };
  const logger = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue({
      uploadDir: './uploads',
      maxFileSizeBytes: 8 * 1024 * 1024,
      maxDocumentFileSizeBytes: 25 * 1024 * 1024,
    }),
  };
  const chunkingQueue = { enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }) };

  beforeEach(async () => {
    jest.clearAllMocks();
    (documentUploadUtil.computeFileHash as jest.Mock).mockReturnValue('deadbeef'.repeat(8));
    (documentUploadUtil.saveDocumentToDisk as jest.Mock).mockResolvedValue('knowledge-documents/fake-key.pdf');
    (documentUploadUtil.validateDocumentFile as jest.Mock).mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        KnowledgeDocumentsService,
        { provide: getRepositoryToken(KnowledgeDocumentEntity), useValue: documentRepo },
        { provide: getRepositoryToken(KnowledgeDocumentVersionEntity), useValue: versionRepo },
        { provide: getRepositoryToken(KnowledgeDocumentTagEntity), useValue: tagRepo },
        { provide: ConfigService, useValue: configService },
        { provide: AppLoggerService, useValue: logger },
        { provide: ChunkProcessingQueueService, useValue: chunkingQueue },
      ],
    }).compile();

    service = moduleRef.get(KnowledgeDocumentsService);
  });

  function mockDuplicateCheck(found: unknown) {
    versionRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(found),
    });
  }

  function mockFindOneDetail(document: unknown) {
    documentRepo.createQueryBuilder.mockReturnValue({
      withDeleted: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(document),
    });
  }

  describe('uploadOne', () => {
    it('tạo document + version 1, đặt activeVersionId, status theo version', async () => {
      mockDuplicateCheck(null);
      documentRepo.save.mockImplementation((x) => Promise.resolve({ id: 'doc-1', ...x }));
      versionRepo.save.mockImplementation((x) =>
        Promise.resolve({ id: 'ver-1', status: KnowledgeDocumentVersionStatus.UPLOADED, ...x }),
      );
      mockFindOneDetail({ id: 'doc-1', title: 'Luật Cư trú', versions: [] });

      const result = await service.uploadOne('user-1', fakeFile, {
        title: 'Luật Cư trú',
        category: KnowledgeDocumentCategory.LEGAL_DOCUMENT,
      });

      expect(result.id).toBe('doc-1');
      // Lần save thứ 2 của documentRepo là sau khi gán activeVersionId
      const secondSaveArg = documentRepo.save.mock.calls[1][0];
      expect(secondSaveArg.activeVersionId).toBe('ver-1');
      expect(secondSaveArg.status).toBe(KnowledgeDocumentVersionStatus.UPLOADED);
    });

    it('file trùng nội dung (hash) với tài liệu đã có -> CONFLICT', async () => {
      mockDuplicateCheck({ document: { id: 'doc-cu', title: 'Đã tồn tại' } });

      await expect(
        service.uploadOne('user-1', fakeFile, {
          title: 'Bản trùng',
          category: KnowledgeDocumentCategory.LEGAL_DOCUMENT,
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.CONFLICT });
    });

    it('thiếu title -> BAD_REQUEST', async () => {
      await expect(
        service.uploadOne('user-1', fakeFile, {
          category: KnowledgeDocumentCategory.LEGAL_DOCUMENT,
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.BAD_REQUEST });
    });
  });

  describe('uploadBulk', () => {
    it('1 file lỗi không chặn các file còn lại', async () => {
      mockDuplicateCheck(null);
      documentRepo.save
        .mockImplementationOnce((x) => Promise.resolve({ id: 'doc-1', ...x }))
        .mockImplementationOnce((x) => Promise.resolve({ id: 'doc-1', ...x }));
      versionRepo.save.mockImplementationOnce((x) =>
        Promise.resolve({ id: 'ver-1', status: KnowledgeDocumentVersionStatus.UPLOADED, ...x }),
      );
      mockFindOneDetail({ id: 'doc-1', versions: [] });
      (documentUploadUtil.validateDocumentFile as jest.Mock)
        .mockImplementationOnce(() => undefined) // file 1 hợp lệ
        .mockImplementationOnce(() => {
          throw new Error('Định dạng không hỗ trợ');
        }); // file 2 lỗi

      const results = await service.uploadBulk(
        'user-1',
        [fakeFile, { ...fakeFile, originalname: 'hong.exe' } as Express.Multer.File],
        { category: KnowledgeDocumentCategory.LEGAL_DOCUMENT },
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Định dạng không hỗ trợ');
    });
  });

  describe('findOne', () => {
    it('không tìm thấy -> NOT_FOUND', async () => {
      mockFindOneDetail(null);
      await expect(service.findOne('khong-co')).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe('remove/restore', () => {
    it('remove: document không tồn tại -> NOT_FOUND', async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('khong-co')).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
    });

    it('remove: gọi softDelete đúng id', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1' });
      await service.remove('doc-1');
      expect(documentRepo.softDelete).toHaveBeenCalledWith({ id: 'doc-1' });
    });

    it('restore: tài liệu chưa bị xóa -> BAD_REQUEST', async () => {
      documentRepo.createQueryBuilder.mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'doc-1', deletedAt: null }),
      });
      await expect(service.restore('doc-1')).rejects.toMatchObject({
        errorCode: ErrorCode.BAD_REQUEST,
      });
    });

    it('restore: tài liệu đã xóa -> gọi restore() rồi trả detail mới', async () => {
      // restore() gọi createQueryBuilder 2 lần: (1) tự kiểm tra deletedAt, (2) findOne() lấy detail mới
      const getOne = jest
        .fn()
        .mockResolvedValueOnce({ id: 'doc-1', deletedAt: new Date() })
        .mockResolvedValueOnce({ id: 'doc-1', versions: [] });
      documentRepo.createQueryBuilder.mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne,
      });
      documentRepo.restore.mockResolvedValue(undefined);

      const result = await service.restore('doc-1');

      expect(documentRepo.restore).toHaveBeenCalledWith({ id: 'doc-1' });
      expect(result.id).toBe('doc-1');
    });
  });

  describe('activateVersion / deactivateVersion', () => {
    it('kích hoạt lần đầu (chưa có active version) -> status = status của version', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1', activeVersionId: null });
      versionRepo.findOne.mockResolvedValue({
        id: 'ver-1',
        documentId: 'doc-1',
        status: KnowledgeDocumentVersionStatus.UPLOADED,
      });
      documentRepo.save.mockResolvedValue(undefined);
      mockFindOneDetail({ id: 'doc-1', versions: [] });

      await service.activateVersion('user-1', 'doc-1', 'ver-1');

      const saved = documentRepo.save.mock.calls[0][0];
      expect(saved.activeVersionId).toBe('ver-1');
      expect(saved.status).toBe(KnowledgeDocumentVersionStatus.UPLOADED);
    });

    it('kích hoạt version KHÁC version đang active -> status = REINDEX_REQUIRED', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1', activeVersionId: 'ver-1' });
      versionRepo.findOne.mockResolvedValue({
        id: 'ver-2',
        documentId: 'doc-1',
        status: KnowledgeDocumentVersionStatus.UPLOADED,
      });
      documentRepo.save.mockResolvedValue(undefined);
      mockFindOneDetail({ id: 'doc-1', versions: [] });

      await service.activateVersion('user-1', 'doc-1', 'ver-2');

      const saved = documentRepo.save.mock.calls[0][0];
      expect(saved.activeVersionId).toBe('ver-2');
      expect(saved.status).toBe(KnowledgeDocumentVersionStatus.REINDEX_REQUIRED);
    });

    it('version không thuộc document -> NOT_FOUND', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1', activeVersionId: null });
      versionRepo.findOne.mockResolvedValue(null);

      await expect(service.activateVersion('user-1', 'doc-1', 'ver-la')).rejects.toMatchObject({
        errorCode: ErrorCode.NOT_FOUND,
      });
    });

    it('deactivate version đang active -> clear activeVersionId, status = UPLOADED', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1', activeVersionId: 'ver-1' });
      versionRepo.findOne.mockResolvedValue({ id: 'ver-1', documentId: 'doc-1' });
      documentRepo.save.mockResolvedValue(undefined);
      mockFindOneDetail({ id: 'doc-1', versions: [] });

      await service.deactivateVersion('user-1', 'doc-1', 'ver-1');

      const saved = documentRepo.save.mock.calls[0][0];
      expect(saved.activeVersionId).toBeNull();
      expect(saved.status).toBe(KnowledgeDocumentVersionStatus.UPLOADED);
    });

    it('deactivate version KHÔNG phải bản active -> không đổi gì trên document', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1', activeVersionId: 'ver-1' });
      versionRepo.findOne.mockResolvedValue({ id: 'ver-2', documentId: 'doc-1' });
      mockFindOneDetail({ id: 'doc-1', versions: [] });

      await service.deactivateVersion('user-1', 'doc-1', 'ver-2');

      expect(documentRepo.save).not.toHaveBeenCalled();
    });
  });
});
