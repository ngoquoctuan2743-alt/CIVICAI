import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { PUBLIC_DATA_CACHE_TTL_MS } from '../../common/constants/app.constants';
import { AppException } from '../../common/exceptions/app.exception';
import { LegalDocumentEntity } from '../../database/entities/legal-document.entity';
import { LegalQueryDto } from './dto/legal-query.dto';

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
}
