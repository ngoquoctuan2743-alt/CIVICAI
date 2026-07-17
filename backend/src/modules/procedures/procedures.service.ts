import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { PUBLIC_DATA_CACHE_TTL_MS } from '../../common/constants/app.constants';
import { AppException } from '../../common/exceptions/app.exception';
import { AdministrativeProcedureEntity } from '../../database/entities/administrative-procedure.entity';
import { ProcedureStatus } from '../../database/entities/enums';
import { ProcedureQueryDto } from './dto/procedure-query.dto';

const CACHE_PREFIX = 'procedures:';

/**
 * ProceduresService — tra cứu thủ tục hành chính.
 * Chi tiết thủ tục trả đủ: cơ quan xử lý, giấy tờ cần chuẩn bị (requirements),
 * các bước thực hiện (steps), thời gian xử lý.
 * Dữ liệu công khai, ít đổi -> cache in-memory TTL 5 phút (PHASE 4, NHIỆM VỤ 9).
 */
@Injectable()
export class ProceduresService {
  constructor(
    @InjectRepository(AdministrativeProcedureEntity)
    private readonly procedureRepo: Repository<AdministrativeProcedureEntity>,
    private readonly cache: MemoryCacheService,
  ) {}

  /** Danh sách thủ tục ACTIVE — search tên/mã, lọc cơ quan, phân trang */
  async findAll(query: ProcedureQueryDto) {
    const cacheKey = `${CACHE_PREFIX}findAll:${JSON.stringify(query)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.procedureRepo
      .createQueryBuilder('procedure')
      .leftJoinAndSelect('procedure.agency', 'agency')
      .where('procedure.status = :status', { status: ProcedureStatus.ACTIVE })
      .orderBy('procedure.name', 'ASC');

    if (query.search) {
      qb.andWhere('(procedure.name ILIKE :search OR procedure.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.agencyId) {
      qb.andWhere('procedure.agencyId = :agencyId', { agencyId: query.agencyId });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    const result = { items, total, page: query.page, limit: query.limit };
    this.cache.set(cacheKey, result, PUBLIC_DATA_CACHE_TTL_MS);
    return result;
  }

  /** Chi tiết thủ tục: agency + requirements (giấy tờ) + steps (các bước) */
  async findOne(id: string): Promise<AdministrativeProcedureEntity> {
    const cacheKey = `${CACHE_PREFIX}findOne:${id}`;
    const cached = this.cache.get<AdministrativeProcedureEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    const procedure = await this.procedureRepo.findOne({
      where: { id },
      relations: { agency: true, steps: true, requirements: true },
      order: {
        steps: { stepNumber: 'ASC' },
        requirements: { sortOrder: 'ASC' },
      },
    });
    if (!procedure) {
      throw AppException.notFound('Không tìm thấy thủ tục hành chính');
    }

    this.cache.set(cacheKey, procedure, PUBLIC_DATA_CACHE_TTL_MS);
    return procedure;
  }
}
