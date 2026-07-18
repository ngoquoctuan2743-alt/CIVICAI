import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  computeFileHash,
  saveDocumentToDisk,
  validateDocumentFile,
} from '../../common/utils/document-upload.util';
import { AppException } from '../../common/exceptions/app.exception';
import { StorageConfig } from '../../config/configuration';
import { KnowledgeDocumentTagEntity } from '../../database/entities/knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from '../../database/entities/knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from '../../database/entities/knowledge-document.entity';
import { KnowledgeDocumentVersionStatus } from '../../database/entities/enums';
import { AppLoggerService } from '../../logger/logger.service';
import { ChunkProcessingQueueService } from '../chunking/chunk-processing-queue.service';
import { KnowledgeDocumentQueryDto } from './dto/knowledge-document-query.dto';
import { UploadKnowledgeDocumentDto } from './dto/upload-knowledge-document.dto';

const STORAGE_SUBDIR = 'knowledge-documents';

/** Kết quả 1 file trong 1 lượt upload hàng loạt — không để 1 file lỗi làm hỏng cả batch */
export interface BulkUploadItemResult {
  fileName: string;
  success: boolean;
  documentId?: string;
  error?: string;
}

/**
 * KnowledgeDocumentsService — Document Ingestion Pipeline (Prompt 02).
 * Phạm vi: upload/versioning/lifecycle/metadata. KHÔNG xử lý chunking/
 * embedding/retrieval (Prompt 03+) — version mới luôn dừng ở status UPLOADED,
 * PROCESSING/READY/FAILED thuộc về bước parse & chunk sau này.
 */
@Injectable()
export class KnowledgeDocumentsService {
  private readonly storage: StorageConfig;

  constructor(
    @InjectRepository(KnowledgeDocumentEntity)
    private readonly documentRepo: Repository<KnowledgeDocumentEntity>,
    @InjectRepository(KnowledgeDocumentVersionEntity)
    private readonly versionRepo: Repository<KnowledgeDocumentVersionEntity>,
    @InjectRepository(KnowledgeDocumentTagEntity)
    private readonly tagRepo: Repository<KnowledgeDocumentTagEntity>,
    configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly chunkingQueue: ChunkProcessingQueueService,
  ) {
    this.logger.setContext(KnowledgeDocumentsService.name);
    this.storage = configService.getOrThrow<StorageConfig>('storage');
  }

  private parseTags(tags: string | undefined): string[] {
    if (!tags) return [];
    return [...new Set(tags.split(',').map((t) => t.trim()).filter(Boolean))];
  }

  /** Từ chối nếu đã tồn tại version khác (của document nào cũng tính, kể cả đã xóa mềm document cha) trùng hash */
  private async assertNotDuplicate(fileHash: string, fileName: string): Promise<void> {
    const existing = await this.versionRepo
      .createQueryBuilder('v')
      .innerJoin('v.document', 'd')
      .where('v.fileHash = :fileHash', { fileHash })
      .andWhere('d.deletedAt IS NULL')
      .select(['v.id', 'd.id', 'd.title'])
      .getOne();
    if (existing) {
      throw AppException.conflict(
        `File "${fileName}" trùng nội dung với tài liệu đã có: "${existing.document.title}" (id: ${existing.document.id})`,
      );
    }
  }

  private async saveTags(documentId: string, tagNames: string[]): Promise<void> {
    if (tagNames.length === 0) return;
    await this.tagRepo.save(tagNames.map((tagName) => this.tagRepo.create({ documentId, tagName })));
  }

  /** Upload 1 tài liệu mới (document + version đầu tiên = 1) */
  async uploadOne(
    userId: string,
    file: Express.Multer.File | undefined,
    dto: UploadKnowledgeDocumentDto,
  ): Promise<KnowledgeDocumentEntity> {
    validateDocumentFile(file, this.storage.maxDocumentFileSizeBytes, 'Thiếu file để tải lên (field "file")');
    if (!dto.title) {
      throw AppException.badRequest('title không được để trống');
    }

    const fileHash = computeFileHash(file.buffer);
    await this.assertNotDuplicate(fileHash, file.originalname);

    const document = await this.documentRepo.save(
      this.documentRepo.create({
        title: dto.title,
        category: dto.category,
        source: dto.source ?? null,
        language: dto.language ?? 'vi',
        agencyId: dto.agencyId ?? null,
        description: dto.description ?? null,
        status: KnowledgeDocumentVersionStatus.NEW,
        createdBy: userId,
      }),
    );

    const version = await this.createVersion(document.id, file, fileHash, userId, 1);

    document.activeVersionId = version.id;
    document.status = version.status;
    document.updatedBy = userId;
    await this.documentRepo.save(document);

    await this.saveTags(document.id, this.parseTags(dto.tags));

    this.logger.log(`Upload knowledge document ${document.id} (${document.title})`);
    return this.findOne(document.id);
  }

  /** Upload nhiều file cùng lúc — metadata dùng chung, title tự lấy theo tên file gốc; 1 file lỗi không chặn các file khác */
  async uploadBulk(
    userId: string,
    files: Express.Multer.File[] | undefined,
    dto: UploadKnowledgeDocumentDto,
  ): Promise<BulkUploadItemResult[]> {
    if (!files || files.length === 0) {
      throw AppException.badRequest('Thiếu file để tải lên (field "files")');
    }

    const results: BulkUploadItemResult[] = [];
    for (const file of files) {
      try {
        const document = await this.uploadOne(userId, file, { ...dto, title: file.originalname });
        results.push({ fileName: file.originalname, success: true, documentId: document.id });
      } catch (error) {
        results.push({
          fileName: file.originalname,
          success: false,
          error: (error as Error).message,
        });
      }
    }
    return results;
  }

  /** Tạo bản ghi version + lưu file vật lý — dùng chung cho upload mới và thêm version */
  private async createVersion(
    documentId: string,
    file: Express.Multer.File,
    fileHash: string,
    userId: string,
    versionNumber: number,
  ): Promise<KnowledgeDocumentVersionEntity> {
    try {
      const storageKey = await saveDocumentToDisk(file, this.storage.uploadDir, STORAGE_SUBDIR);
      const saved = await this.versionRepo.save(
        this.versionRepo.create({
          documentId,
          versionNumber,
          storageKey,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: String(file.size),
          fileHash,
          status: KnowledgeDocumentVersionStatus.UPLOADED,
          uploadedBy: userId,
        }),
      );
      // Hook Prompt 03: tự động đưa vào hàng đợi Parsing & Chunking ngay sau
      // khi file lưu thành công — không chờ Admin gọi reparse thủ công.
      void this.chunkingQueue.enqueue(documentId, saved.id, userId);
      return saved;
    } catch (error) {
      // Lưu bản ghi FAILED để không mất metadata (yêu cầu "Never lose metadata")
      const failed = await this.versionRepo.save(
        this.versionRepo.create({
          documentId,
          versionNumber,
          storageKey: `FAILED/${documentId}/${versionNumber}`,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: String(file.size),
          fileHash,
          status: KnowledgeDocumentVersionStatus.FAILED,
          failureReason: (error as Error).message.slice(0, 500),
          uploadedBy: userId,
        }),
      );
      this.logger.error(`Luu file that bai cho document ${documentId}: ${(error as Error).message}`);
      return failed;
    }
  }

  /** Thêm version mới cho tài liệu đã có (không tự động kích hoạt — phải gọi activateVersion riêng) */
  async uploadNewVersion(
    userId: string,
    documentId: string,
    file: Express.Multer.File | undefined,
  ): Promise<KnowledgeDocumentVersionEntity> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw AppException.notFound('Không tìm thấy tài liệu');
    }
    validateDocumentFile(file, this.storage.maxDocumentFileSizeBytes, 'Thiếu file để tải lên (field "file")');

    const fileHash = computeFileHash(file.buffer);
    await this.assertNotDuplicate(fileHash, file.originalname);

    const maxVersion = await this.versionRepo
      .createQueryBuilder('v')
      .where('v.documentId = :documentId', { documentId })
      .select('MAX(v.versionNumber)', 'max')
      .getRawOne<{ max: number | null }>();
    const nextVersionNumber = (maxVersion?.max ?? 0) + 1;

    return this.createVersion(documentId, file, fileHash, userId, nextVersionNumber);
  }

  /** Danh sách tài liệu — search/filter/phân trang (ADMIN) */
  async findAll(query: KnowledgeDocumentQueryDto) {
    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.agency', 'agency')
      .leftJoinAndSelect('doc.tags', 'tags')
      .orderBy('doc.updatedAt', 'DESC');

    if (query.includeDeleted) {
      qb.withDeleted();
    }
    if (query.search) {
      qb.andWhere('doc.title ILIKE :search', { search: `%${query.search}%` });
    }
    if (query.category) {
      qb.andWhere('doc.category = :category', { category: query.category });
    }
    if (query.status) {
      qb.andWhere('doc.status = :status', { status: query.status });
    }
    if (query.agencyId) {
      qb.andWhere('doc.agencyId = :agencyId', { agencyId: query.agencyId });
    }
    if (query.tag) {
      qb.andWhere('EXISTS (SELECT 1 FROM knowledge_document_tags t WHERE t.document_id = doc.id AND t.tag_name = :tag)', {
        tag: query.tag,
      });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }

  /** Chi tiết tài liệu kèm toàn bộ version (mới nhất trước) + tag */
  async findOne(id: string): Promise<KnowledgeDocumentEntity> {
    const document = await this.documentRepo
      .createQueryBuilder('doc')
      .withDeleted()
      .leftJoinAndSelect('doc.agency', 'agency')
      .leftJoinAndSelect('doc.tags', 'tags')
      .leftJoinAndSelect('doc.versions', 'versions')
      .where('doc.id = :id', { id })
      .orderBy('versions.versionNumber', 'DESC')
      .getOne();
    if (!document) {
      throw AppException.notFound('Không tìm thấy tài liệu');
    }
    return document;
  }

  /** Xóa mềm tài liệu (metadata + version vẫn giữ nguyên trong DB, chỉ ẩn khỏi tra cứu) */
  async remove(id: string): Promise<void> {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) {
      throw AppException.notFound('Không tìm thấy tài liệu');
    }
    await this.documentRepo.softDelete({ id });
  }

  /** Khôi phục tài liệu đã xóa mềm */
  async restore(id: string): Promise<KnowledgeDocumentEntity> {
    const document = await this.documentRepo
      .createQueryBuilder('doc')
      .withDeleted()
      .where('doc.id = :id', { id })
      .getOne();
    if (!document) {
      throw AppException.notFound('Không tìm thấy tài liệu');
    }
    if (!document.deletedAt) {
      throw AppException.badRequest('Tài liệu chưa bị xóa, không cần khôi phục');
    }
    await this.documentRepo.restore({ id });
    return this.findOne(id);
  }

  private async getOwnedVersion(
    documentId: string,
    versionId: string,
  ): Promise<KnowledgeDocumentVersionEntity> {
    const version = await this.versionRepo.findOne({ where: { id: versionId, documentId } });
    if (!version) {
      throw AppException.notFound('Không tìm thấy version thuộc tài liệu này');
    }
    return version;
  }

  /**
   * Kích hoạt 1 version làm bản hiện hành. Nếu tài liệu đã có version hiện
   * hành KHÁC trước đó, đánh dấu status = REINDEX_REQUIRED (nội dung phục vụ
   * retrieval đã đổi, kho tri thức RAG cần nạp lại — xử lý thật ở Prompt 03+).
   * Lần kích hoạt đầu tiên (chưa có version nào active) thì lấy thẳng status
   * của version đó (hiện tại luôn là UPLOADED trong phạm vi pipeline này).
   */
  async activateVersion(
    userId: string,
    documentId: string,
    versionId: string,
  ): Promise<KnowledgeDocumentEntity> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw AppException.notFound('Không tìm thấy tài liệu');
    }
    const version = await this.getOwnedVersion(documentId, versionId);

    const hadDifferentActiveVersion =
      document.activeVersionId !== null && document.activeVersionId !== versionId;

    document.activeVersionId = version.id;
    document.status = hadDifferentActiveVersion
      ? KnowledgeDocumentVersionStatus.REINDEX_REQUIRED
      : version.status;
    document.updatedBy = userId;
    await this.documentRepo.save(document);
    return this.findOne(documentId);
  }

  /** Bỏ kích hoạt version — nếu đang là version hiện hành thì tài liệu tạm thời không có bản active nào */
  async deactivateVersion(
    userId: string,
    documentId: string,
    versionId: string,
  ): Promise<KnowledgeDocumentEntity> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw AppException.notFound('Không tìm thấy tài liệu');
    }
    await this.getOwnedVersion(documentId, versionId);

    if (document.activeVersionId === versionId) {
      document.activeVersionId = null;
      document.status = KnowledgeDocumentVersionStatus.UPLOADED;
      document.updatedBy = userId;
      await this.documentRepo.save(document);
    }
    return this.findOne(documentId);
  }
}
