import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { PUBLIC_DATA_CACHE_TTL_MS } from '../../common/constants/app.constants';
import { AppException } from '../../common/exceptions/app.exception';
import { GovernmentAgencyEntity } from '../../database/entities/government-agency.entity';
import { AgencyQueryDto } from './dto/agency-query.dto';

const CACHE_PREFIX = 'government:';

/**
 * GovernmentService — tra cứu danh bạ cơ quan nhà nước.
 * Dữ liệu công khai, ít đổi -> cache in-memory TTL 5 phút (PHASE 4, NHIỆM VỤ 9).
 */
@Injectable()
export class GovernmentService {
  constructor(
    @InjectRepository(GovernmentAgencyEntity)
    private readonly agencyRepo: Repository<GovernmentAgencyEntity>,
    private readonly cache: MemoryCacheService,
  ) {}

  /** Danh sách cơ quan — search theo tên/mã, lọc theo cấp, phân trang */
  async findAll(query: AgencyQueryDto) {
    const cacheKey = `${CACHE_PREFIX}findAll:${JSON.stringify(query)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.agencyRepo
      .createQueryBuilder('agency')
      .leftJoinAndSelect('agency.adminUnit', 'adminUnit')
      .orderBy('agency.name', 'ASC');

    if (query.search) {
      qb.andWhere('(agency.name ILIKE :search OR agency.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.level) {
      qb.andWhere('agency.level = :level', { level: query.level });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const result = { items, total, page: query.page, limit: query.limit };
    this.cache.set(cacheKey, result, PUBLIC_DATA_CACHE_TTL_MS);
    return result;
  }

  /** Chi tiết một cơ quan (kèm cơ quan cấp trên + địa bàn + thủ tục phụ trách) */
  async findOne(id: string): Promise<GovernmentAgencyEntity> {
    const cacheKey = `${CACHE_PREFIX}findOne:${id}`;
    const cached = this.cache.get<GovernmentAgencyEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    const agency = await this.agencyRepo.findOne({
      where: { id },
      relations: { parent: true, adminUnit: true },
    });
    if (!agency) {
      throw AppException.notFound('Không tìm thấy cơ quan');
    }

    this.cache.set(cacheKey, agency, PUBLIC_DATA_CACHE_TTL_MS);
    return agency;
  }
}
