import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { AdministrativeUnitEntity } from '../../database/entities/administrative-unit.entity';
import { CitizenProfileEntity } from '../../database/entities/citizen-profile.entity';
import { AdminUnitType } from '../../database/entities/enums';
import { AppLoggerService } from '../../logger/logger.service';
import { UpsertCitizenProfileDto } from './dto/upsert-citizen-profile.dto';

/**
 * CitizenService — hồ sơ công dân (1-1 với tài khoản).
 */
@Injectable()
export class CitizenService {
  constructor(
    @InjectRepository(CitizenProfileEntity)
    private readonly profileRepo: Repository<CitizenProfileEntity>,
    @InjectRepository(AdministrativeUnitEntity)
    private readonly adminUnitRepo: Repository<AdministrativeUnitEntity>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(CitizenService.name);
  }

  /** Lấy hồ sơ công dân của user hiện tại */
  async getMyProfile(userId: string): Promise<CitizenProfileEntity> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: { province: true, ward: true },
    });
    if (!profile) {
      throw AppException.notFound('Bạn chưa tạo hồ sơ công dân');
    }
    return profile;
  }

  /** Tạo hồ sơ công dân (mỗi tài khoản chỉ có một) */
  async createProfile(userId: string, dto: UpsertCitizenProfileDto): Promise<CitizenProfileEntity> {
    const existed = await this.profileRepo.findOne({ where: { userId } });
    if (existed) {
      throw AppException.conflict('Hồ sơ công dân đã tồn tại — dùng API cập nhật');
    }

    await this.validateReferences(userId, dto);

    const profile = this.profileRepo.create({
      userId,
      nationalId: dto.nationalId ?? null,
      dateOfBirth: dto.dateOfBirth ?? null,
      gender: dto.gender ?? null,
      provinceId: dto.provinceId ?? null,
      wardId: dto.wardId ?? null,
      addressDetail: dto.addressDetail ?? null,
      createdBy: userId,
    });
    await this.profileRepo.save(profile);
    this.logger.log(`Tạo hồ sơ công dân cho user ${userId}`);
    return this.getMyProfile(userId);
  }

  /** Cập nhật hồ sơ công dân — chỉ ghi đè các trường được gửi lên */
  async updateProfile(userId: string, dto: UpsertCitizenProfileDto): Promise<CitizenProfileEntity> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw AppException.notFound('Bạn chưa tạo hồ sơ công dân — dùng API tạo mới');
    }

    await this.validateReferences(userId, dto);

    if (dto.nationalId !== undefined) profile.nationalId = dto.nationalId;
    if (dto.dateOfBirth !== undefined) profile.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.provinceId !== undefined) profile.provinceId = dto.provinceId;
    if (dto.wardId !== undefined) profile.wardId = dto.wardId;
    if (dto.addressDetail !== undefined) profile.addressDetail = dto.addressDetail;
    profile.updatedBy = userId;

    await this.profileRepo.save(profile);
    return this.getMyProfile(userId);
  }

  /**
   * Kiểm tra ràng buộc: CCCD không trùng người khác; province/ward tồn tại
   * và đúng loại đơn vị hành chính.
   */
  private async validateReferences(userId: string, dto: UpsertCitizenProfileDto): Promise<void> {
    if (dto.nationalId) {
      const dup = await this.profileRepo.findOne({
        where: { nationalId: dto.nationalId, userId: Not(userId) },
      });
      if (dup) {
        throw AppException.conflict('Số CCCD đã được đăng ký bởi tài khoản khác');
      }
    }

    if (dto.provinceId) {
      const province = await this.adminUnitRepo.findOne({ where: { id: dto.provinceId } });
      if (!province || province.type !== AdminUnitType.PROVINCE) {
        throw AppException.badRequest('provinceId không phải tỉnh/thành hợp lệ');
      }
    }

    if (dto.wardId) {
      const ward = await this.adminUnitRepo.findOne({ where: { id: dto.wardId } });
      if (!ward || ward.type !== AdminUnitType.WARD) {
        throw AppException.badRequest('wardId không phải xã/phường hợp lệ');
      }
    }
  }
}
