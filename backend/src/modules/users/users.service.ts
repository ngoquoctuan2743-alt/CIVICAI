import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { CitizenProfileEntity } from '../../database/entities/citizen-profile.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { AuthService } from '../auth/auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * UsersService — quản lý tài khoản của chính người dùng đang đăng nhập.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(CitizenProfileEntity)
    private readonly profileRepo: Repository<CitizenProfileEntity>,
    private readonly authService: AuthService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(UsersService.name);
  }

  /** Hồ sơ đầy đủ: tài khoản + roles + citizen profile (nếu có) */
  async getProfile(userId: string) {
    const user = await this.findUserOrFail(userId);
    const citizenProfile = await this.profileRepo.findOne({
      where: { userId },
      relations: { province: true, ward: true },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      roles: (user.roles ?? []).map((r) => r.code),
      citizenProfile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /** Cập nhật thông tin cơ bản (họ tên, số điện thoại) */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findUserOrFail(userId);

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }
    user.updatedBy = userId;

    await this.userRepo.save(user);
    return this.getProfile(userId);
  }

  /** Xóa tài khoản (soft delete) + thu hồi toàn bộ refresh token */
  async deleteAccount(userId: string): Promise<{ message: string }> {
    await this.findUserOrFail(userId);
    await this.authService.revokeAllTokens(userId);
    await this.userRepo.softDelete({ id: userId });
    this.logger.log(`Tài khoản ${userId} đã tự xóa (soft delete)`);
    return { message: 'Tài khoản đã được xóa' };
  }

  private async findUserOrFail(userId: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: { roles: true } });
    if (!user) {
      throw AppException.notFound('Không tìm thấy tài khoản');
    }
    return user;
  }
}
