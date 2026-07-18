import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { PUBLIC_DATA_CACHE_TTL_MS } from '../../common/constants/app.constants';
import { AppException } from '../../common/exceptions/app.exception';
import { AdministrativeProcedureEntity } from '../../database/entities/administrative-procedure.entity';
import { AdministrativeUnitEntity } from '../../database/entities/administrative-unit.entity';
import { AdminUnitType } from '../../database/entities/enums';
import { GovernmentAgencyEntity } from '../../database/entities/government-agency.entity';
import { AgencyQueryDto } from './dto/agency-query.dto';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

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
    @InjectRepository(AdministrativeProcedureEntity)
    private readonly procedureRepo: Repository<AdministrativeProcedureEntity>,
    @InjectRepository(AdministrativeUnitEntity)
    private readonly adminUnitRepo: Repository<AdministrativeUnitEntity>,
    private readonly cache: MemoryCacheService,
  ) {}

  /** Danh sách tỉnh/thành — phục vụ dropdown lọc theo địa phương (Frontend, PROMPT 20) */
  async findProvinces() {
    const cacheKey = `${CACHE_PREFIX}provinces`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const provinces = await this.adminUnitRepo.find({
      where: { type: AdminUnitType.PROVINCE },
      order: { name: 'ASC' },
    });
    this.cache.set(cacheKey, provinces, PUBLIC_DATA_CACHE_TTL_MS);
    return provinces;
  }

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
    if (query.provinceId) {
      qb.andWhere('agency.adminUnitId = :provinceId', { provinceId: query.provinceId });
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

  /** Tạo cơ quan nhà nước mới (ADMIN) */
  async create(dto: CreateAgencyDto): Promise<GovernmentAgencyEntity> {
    const existed = await this.agencyRepo.findOne({ where: { code: dto.code } });
    if (existed) {
      throw AppException.conflict(`Mã cơ quan "${dto.code}" đã tồn tại`);
    }
    if (dto.parentId) {
      await this.assertAgencyExists(dto.parentId, 'parentId');
    }

    const agency = this.agencyRepo.create({
      code: dto.code,
      name: dto.name,
      level: dto.level,
      parentId: dto.parentId ?? null,
      adminUnitId: dto.adminUnitId ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      website: dto.website ?? null,
    });
    await this.agencyRepo.save(agency);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return agency;
  }

  /** Cập nhật cơ quan nhà nước (ADMIN) — chỉ ghi đè field được gửi lên */
  async update(id: string, dto: UpdateAgencyDto): Promise<GovernmentAgencyEntity> {
    const agency = await this.agencyRepo.findOne({ where: { id } });
    if (!agency) {
      throw AppException.notFound('Không tìm thấy cơ quan');
    }

    if (dto.code !== undefined && dto.code !== agency.code) {
      const existed = await this.agencyRepo.findOne({ where: { code: dto.code } });
      if (existed) {
        throw AppException.conflict(`Mã cơ quan "${dto.code}" đã tồn tại`);
      }
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw AppException.badRequest('Cơ quan không thể là cấp trên của chính nó');
      }
      if (dto.parentId) {
        await this.assertAgencyExists(dto.parentId, 'parentId');
      }
    }

    if (dto.code !== undefined) agency.code = dto.code;
    if (dto.name !== undefined) agency.name = dto.name;
    if (dto.level !== undefined) agency.level = dto.level;
    if (dto.parentId !== undefined) agency.parentId = dto.parentId;
    if (dto.adminUnitId !== undefined) agency.adminUnitId = dto.adminUnitId;
    if (dto.address !== undefined) agency.address = dto.address;
    if (dto.phone !== undefined) agency.phone = dto.phone;
    if (dto.email !== undefined) agency.email = dto.email;
    if (dto.website !== undefined) agency.website = dto.website;

    await this.agencyRepo.save(agency);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return agency;
  }

  /**
   * Xóa cơ quan nhà nước (ADMIN) — hard delete thật vì entity không có field
   * status để soft-toggle (khác Procedures/LegalDocument). Chặn xóa nếu đang
   * bị tham chiếu (thủ tục đang gán cơ quan này, hoặc là cơ quan cấp trên của
   * cơ quan khác) để tránh vi phạm FK / mồ côi dữ liệu.
   */
  async remove(id: string): Promise<{ message: string }> {
    const agency = await this.agencyRepo.findOne({ where: { id } });
    if (!agency) {
      throw AppException.notFound('Không tìm thấy cơ quan');
    }

    const usedByProcedure = await this.procedureRepo.count({ where: { agencyId: id } });
    if (usedByProcedure > 0) {
      throw AppException.conflict(
        `Không thể xóa: còn ${usedByProcedure} thủ tục hành chính đang gán cơ quan này`,
      );
    }
    const childCount = await this.agencyRepo.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw AppException.conflict(`Không thể xóa: còn ${childCount} cơ quan cấp dưới tham chiếu`);
    }

    await this.agencyRepo.remove(agency);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return { message: 'Cơ quan đã được xóa' };
  }

  /** Danh sách cơ quan cho màn Admin (không cache — dữ liệu cần mới nhất khi vừa sửa) */
  async findAllForAdmin(query: AgencyQueryDto) {
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
    if (query.provinceId) {
      qb.andWhere('agency.adminUnitId = :provinceId', { provinceId: query.provinceId });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }

  private async assertAgencyExists(id: string, field: string): Promise<void> {
    const exists = await this.agencyRepo.exists({ where: { id } });
    if (!exists) {
      throw AppException.badRequest(`${field} không tồn tại`);
    }
  }
}
