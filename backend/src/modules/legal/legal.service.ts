import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { PUBLIC_DATA_CACHE_TTL_MS } from '../../common/constants/app.constants';
import { AppException } from '../../common/exceptions/app.exception';
import { LegalDocumentEntity } from '../../database/entities/legal-document.entity';
import { LegalDocStatus } from '../../database/entities/enums';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { LegalQueryDto } from './dto/legal-query.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';

const CACHE_PREFIX = 'legal:';

/**
 * LegalService — tra cứu văn bản pháp luật (luật, nghị định, thông tư...).
 * Dữ liệu công khai, ít đổi -> cache in-memory TTL 5 phút (PHASE 4, NHIỆM VỤ 9).
 */
@Injectable()
export class LegalService {
  constructor(
    @InjectRepository(LegalDocumentEntity)
    private readonly legalRepo: Repository<LegalDocumentEntity>,
    private readonly cache: MemoryCacheService,
  ) {}

  /** Danh sách văn bản — search tiêu đề/số hiệu, lọc loại + hiệu lực, phân trang */
  async findAll(query: LegalQueryDto) {
    const cacheKey = `${CACHE_PREFIX}findAll:${JSON.stringify(query)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.legalRepo
      .createQueryBuilder('doc')
      .orderBy('doc.issuedDate', 'DESC', 'NULLS LAST');

    if (query.search) {
      qb.andWhere('(doc.title ILIKE :search OR doc.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.docType) {
      qb.andWhere('doc.docType = :docType', { docType: query.docType });
    }
    if (query.status) {
      qb.andWhere('doc.status = :status', { status: query.status });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const result = { items, total, page: query.page, limit: query.limit };
    this.cache.set(cacheKey, result, PUBLIC_DATA_CACHE_TTL_MS);
    return result;
  }

  /** Chi tiết một văn bản pháp luật */
  async findOne(id: string): Promise<LegalDocumentEntity> {
    const cacheKey = `${CACHE_PREFIX}findOne:${id}`;
    const cached = this.cache.get<LegalDocumentEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    const doc = await this.legalRepo.findOne({ where: { id } });
    if (!doc) {
      throw AppException.notFound('Không tìm thấy văn bản pháp luật');
    }

    this.cache.set(cacheKey, doc, PUBLIC_DATA_CACHE_TTL_MS);
    return doc;
  }

  /** Tạo văn bản pháp luật mới (ADMIN) */
  async create(dto: CreateLegalDocumentDto): Promise<LegalDocumentEntity> {
    const existed = await this.legalRepo.findOne({ where: { code: dto.code } });
    if (existed) {
      throw AppException.conflict(`Số hiệu văn bản "${dto.code}" đã tồn tại`);
    }

    const doc = this.legalRepo.create({
      code: dto.code,
      title: dto.title,
      docType: dto.docType,
      issuingBody: dto.issuingBody,
      issuedDate: dto.issuedDate ?? null,
      effectiveDate: dto.effectiveDate ?? null,
      expiryDate: dto.expiryDate ?? null,
      status: dto.status ?? LegalDocStatus.CON_HIEU_LUC,
      sourceUrl: dto.sourceUrl ?? null,
      summary: dto.summary ?? null,
    });
    await this.legalRepo.save(doc);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return doc;
  }

  /** Cập nhật văn bản pháp luật (ADMIN) — chỉ ghi đè field được gửi lên */
  async update(id: string, dto: UpdateLegalDocumentDto): Promise<LegalDocumentEntity> {
    const doc = await this.legalRepo.findOne({ where: { id } });
    if (!doc) {
      throw AppException.notFound('Không tìm thấy văn bản pháp luật');
    }

    if (dto.code !== undefined && dto.code !== doc.code) {
      const existed = await this.legalRepo.findOne({ where: { code: dto.code } });
      if (existed) {
        throw AppException.conflict(`Số hiệu văn bản "${dto.code}" đã tồn tại`);
      }
    }

    if (dto.code !== undefined) doc.code = dto.code;
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.docType !== undefined) doc.docType = dto.docType;
    if (dto.issuingBody !== undefined) doc.issuingBody = dto.issuingBody;
    if (dto.issuedDate !== undefined) doc.issuedDate = dto.issuedDate;
    if (dto.effectiveDate !== undefined) doc.effectiveDate = dto.effectiveDate;
    if (dto.expiryDate !== undefined) doc.expiryDate = dto.expiryDate;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.sourceUrl !== undefined) doc.sourceUrl = dto.sourceUrl;
    if (dto.summary !== undefined) doc.summary = dto.summary;

    await this.legalRepo.save(doc);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return doc;
  }

  /**
   * "Xóa" văn bản pháp luật (ADMIN) = chuyển status sang HET_HIEU_LUC.
   * Không hard-delete vì kb_chunks có thể đang trích dẫn văn bản cho RAG —
   * status đã sẵn có đúng mục đích loại khỏi nguồn trích dẫn AI mà không mất dữ liệu.
   */
  async deactivate(id: string): Promise<LegalDocumentEntity> {
    const doc = await this.legalRepo.findOne({ where: { id } });
    if (!doc) {
      throw AppException.notFound('Không tìm thấy văn bản pháp luật');
    }
    doc.status = LegalDocStatus.HET_HIEU_LUC;
    await this.legalRepo.save(doc);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return doc;
  }

  /** Danh sách văn bản cho màn Admin (không cache — dữ liệu cần mới nhất khi vừa sửa) */
  async findAllForAdmin(query: LegalQueryDto) {
    const qb = this.legalRepo.createQueryBuilder('doc').orderBy('doc.updatedAt', 'DESC');

    if (query.search) {
      qb.andWhere('(doc.title ILIKE :search OR doc.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.docType) {
      qb.andWhere('doc.docType = :docType', { docType: query.docType });
    }
    if (query.status) {
      qb.andWhere('doc.status = :status', { status: query.status });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }
}
