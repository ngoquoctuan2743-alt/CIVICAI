import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { StorageConfig } from '../../config/configuration';
import { CitizenProfileEntity } from '../../database/entities/citizen-profile.entity';
import { UserStatus } from '../../database/entities/enums';
import { UserEntity } from '../../database/entities/user.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { AuthService } from '../auth/auth.service';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserQueryDto } from './dto/user-query.dto';

/** Định dạng ảnh cho phép làm avatar (khớp OCR — DocumentsService) */
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const AVATAR_MAGIC_BYTE_CHECKS: Record<(typeof ALLOWED_AVATAR_MIME_TYPES)[number], (buf: Buffer) => boolean> = {
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a,
  'image/webp': (buf) =>
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP',
};

/**
 * UsersService — quản lý tài khoản của chính người dùng đang đăng nhập.
 */
@Injectable()
export class UsersService {
  private readonly storage: StorageConfig;

  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(CitizenProfileEntity)
    private readonly profileRepo: Repository<CitizenProfileEntity>,
    private readonly authService: AuthService,
    private readonly logger: AppLoggerService,
    configService: ConfigService,
  ) {
    this.logger.setContext(UsersService.name);
    this.storage = configService.getOrThrow<StorageConfig>('storage');
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
      avatarUrl: user.avatarUrl,
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

  /**
   * Upload ảnh đại diện — lưu vào storage local (tái dùng cấu hình storage của OCR).
   * CHÚ Ý: chưa bật static file serving ở main.ts nên avatarUrl hiện là storage key
   * nội bộ, chưa phải URL công khai xem được trực tiếp trên trình duyệt — cần bổ
   * sung serving/CDN ở giai đoạn triển khai thật (ghi rõ trong known-limitations).
   */
  async uploadAvatar(userId: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw AppException.badRequest('Thiếu file ảnh đại diện (field "file")');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
      throw AppException.badRequest(
        `Định dạng ảnh không hỗ trợ: ${file.mimetype}. Chỉ chấp nhận: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}`,
      );
    }
    const mimetype = file.mimetype as (typeof ALLOWED_AVATAR_MIME_TYPES)[number];
    if (!AVATAR_MAGIC_BYTE_CHECKS[mimetype](file.buffer)) {
      throw AppException.badRequest('Nội dung file không khớp định dạng ảnh khai báo. File có thể bị giả mạo.');
    }
    if (file.size > this.storage.maxFileSizeBytes) {
      throw AppException.badRequest(
        `File vượt quá dung lượng tối đa ${Math.round(this.storage.maxFileSizeBytes / 1024 / 1024)}MB`,
      );
    }

    const user = await this.findUserOrFail(userId);
    await mkdir(join(this.storage.uploadDir, 'avatars'), { recursive: true });
    const storageKey = `avatars/${randomUUID()}${extname(file.originalname) || '.jpg'}`;
    await writeFile(join(this.storage.uploadDir, storageKey), file.buffer);

    user.avatarUrl = storageKey;
    user.updatedBy = userId;
    await this.userRepo.save(user);
    this.logger.log(`User ${userId} da cap nhat avatar (${storageKey})`);
    return this.getProfile(userId);
  }

  /** Đổi mật khẩu — ủy quyền cho AuthService (nơi giữ logic hash/verify mật khẩu) */
  changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    return this.authService.changePassword(userId, dto);
  }

  /** Xóa tài khoản (soft delete) + thu hồi toàn bộ refresh token */
  async deleteAccount(userId: string): Promise<{ message: string }> {
    await this.findUserOrFail(userId);
    await this.authService.revokeAllTokens(userId);
    await this.userRepo.softDelete({ id: userId });
    this.logger.log(`Tài khoản ${userId} đã tự xóa (soft delete)`);
    return { message: 'Tài khoản đã được xóa' };
  }

  /** Danh sách tài khoản (ADMIN) — search email/họ tên, lọc status/role, phân trang */
  async findAllForAdmin(query: UserQueryDto) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .orderBy('user.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere('(user.email ILIKE :search OR user.fullName ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.role) {
      qb.andWhere('role.code = :role', { role: query.role });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        status: u.status,
        roles: (u.roles ?? []).map((r) => r.code),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** Chi tiết một tài khoản (ADMIN) */
  async findOneForAdmin(id: string) {
    return this.getProfile(id);
  }

  /** Khóa/mở tài khoản (ADMIN) — khóa thì thu hồi luôn mọi phiên đang đăng nhập */
  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.findUserOrFail(id);
    user.status = dto.status;
    await this.userRepo.save(user);

    if (dto.status !== UserStatus.ACTIVE) {
      await this.authService.revokeAllTokens(id);
    }
    this.logger.log(`Tai khoan ${id} doi status -> ${dto.status}`);
    return this.getProfile(id);
  }

  private async findUserOrFail(userId: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: { roles: true } });
    if (!user) {
      throw AppException.notFound('Không tìm thấy tài khoản');
    }
    return user;
  }
}
