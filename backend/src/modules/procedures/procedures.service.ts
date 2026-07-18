import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { PUBLIC_DATA_CACHE_TTL_MS } from '../../common/constants/app.constants';
import { AppException } from '../../common/exceptions/app.exception';
import { AdministrativeProcedureEntity } from '../../database/entities/administrative-procedure.entity';
import { ProcedureStatus } from '../../database/entities/enums';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { ProcedureQueryDto } from './dto/procedure-query.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';

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
    if (query.category) {
      qb.andWhere('procedure.category = :category', { category: query.category });
    }
    if (query.provinceId) {
      qb.andWhere('agency.adminUnitId = :provinceId', { provinceId: query.provinceId });
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

  /** Tạo thủ tục hành chính mới (ADMIN) */
  async create(dto: CreateProcedureDto): Promise<AdministrativeProcedureEntity> {
    const existed = await this.procedureRepo.findOne({ where: { code: dto.code } });
    if (existed) {
      throw AppException.conflict(`Mã thủ tục "${dto.code}" đã tồn tại`);
    }

    const procedure = this.procedureRepo.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      agencyId: dto.agencyId ?? null,
      onlineLevel: dto.onlineLevel ?? null,
      feeText: dto.feeText ?? null,
      processingTimeText: dto.processingTimeText ?? null,
      legalBasisText: dto.legalBasisText ?? null,
      status: dto.status ?? ProcedureStatus.ACTIVE,
    });
    await this.procedureRepo.save(procedure);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return this.findOne(procedure.id);
  }

  /** Cập nhật thủ tục hành chính (ADMIN) — chỉ ghi đè field được gửi lên */
  async update(id: string, dto: UpdateProcedureDto): Promise<AdministrativeProcedureEntity> {
    const procedure = await this.procedureRepo.findOne({ where: { id } });
    if (!procedure) {
      throw AppException.notFound('Không tìm thấy thủ tục hành chính');
    }

    if (dto.code !== undefined && dto.code !== procedure.code) {
      const existed = await this.procedureRepo.findOne({ where: { code: dto.code } });
      if (existed) {
        throw AppException.conflict(`Mã thủ tục "${dto.code}" đã tồn tại`);
      }
    }

    if (dto.code !== undefined) procedure.code = dto.code;
    if (dto.name !== undefined) procedure.name = dto.name;
    if (dto.description !== undefined) procedure.description = dto.description;
    if (dto.agencyId !== undefined) procedure.agencyId = dto.agencyId;
    if (dto.onlineLevel !== undefined) procedure.onlineLevel = dto.onlineLevel;
    if (dto.feeText !== undefined) procedure.feeText = dto.feeText;
    if (dto.processingTimeText !== undefined) procedure.processingTimeText = dto.processingTimeText;
    if (dto.legalBasisText !== undefined) procedure.legalBasisText = dto.legalBasisText;
    if (dto.status !== undefined) procedure.status = dto.status;

    await this.procedureRepo.save(procedure);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return this.findOne(id);
  }

  /**
   * "Xóa" thủ tục hành chính (ADMIN) = chuyển status sang INACTIVE.
   * Không hard-delete vì procedure_steps/procedure_requirements phụ thuộc CASCADE
   * và có thể đang được kb_chunks trích dẫn cho RAG — status đã sẵn có đúng mục
   * đích ẩn khỏi tra cứu công khai (findAll chỉ lấy ACTIVE) mà không mất dữ liệu.
   */
  async deactivate(id: string): Promise<AdministrativeProcedureEntity> {
    const procedure = await this.procedureRepo.findOne({ where: { id } });
    if (!procedure) {
      throw AppException.notFound('Không tìm thấy thủ tục hành chính');
    }
    procedure.status = ProcedureStatus.INACTIVE;
    await this.procedureRepo.save(procedure);
    this.cache.invalidatePrefix(CACHE_PREFIX);
    return procedure;
  }

  /** Danh sách thủ tục cho màn Admin — không lọc status (thấy cả INACTIVE) */
  async findAllForAdmin(query: ProcedureQueryDto) {
    const qb = this.procedureRepo
      .createQueryBuilder('procedure')
      .leftJoinAndSelect('procedure.agency', 'agency')
      .orderBy('procedure.updatedAt', 'DESC');

    if (query.search) {
      qb.andWhere('(procedure.name ILIKE :search OR procedure.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.agencyId) {
      qb.andWhere('procedure.agencyId = :agencyId', { agencyId: query.agencyId });
    }
    if (query.category) {
      qb.andWhere('procedure.category = :category', { category: query.category });
    }
    if (query.provinceId) {
      qb.andWhere('agency.adminUnitId = :provinceId', { provinceId: query.provinceId });
    }
    if (query.level) {
      qb.andWhere('agency.level = :level', { level: query.level });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }
}
