import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { Environment } from '../../common/enums/environment.enum';
import { Role } from '../../common/enums/role.enum';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthConfig } from '../../config/configuration';
import { UserStatus } from '../../database/entities/enums';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

/** Số vòng băm bcrypt */
const BCRYPT_ROUNDS = 10;
/** Thời hạn hiệu lực token đặt lại mật khẩu */
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Kết quả phát hành token */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** TTL access token (giây) để client chủ động refresh */
  accessExpiresIn: string;
}

/** Thông tin user an toàn để trả về client (không chứa password hash) */
export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AuthService — đăng ký, đăng nhập, refresh (rotation), logout.
 * Refresh token: chuỗi ngẫu nhiên 96 hex, DB chỉ lưu SHA-256 hash.
 */
@Injectable()
export class AuthService {
  private readonly authConfig: AuthConfig;
  private readonly appEnv: Environment;

  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly logger: AppLoggerService,
    private readonly auditLog: AuditLogService,
    configService: ConfigService,
  ) {
    this.logger.setContext(AuthService.name);
    this.authConfig = configService.getOrThrow<AuthConfig>('auth');
    this.appEnv = configService.getOrThrow<Environment>('app.env');
  }

  /** Đăng ký tài khoản mới — gán role CITIZEN mặc định */
  async register(dto: RegisterDto): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const email = dto.email.trim().toLowerCase();

    const existed = await this.userRepo.findOne({ where: { email } });
    if (existed) {
      throw AppException.conflict('Email đã được đăng ký');
    }

    const citizenRole = await this.roleRepo.findOne({ where: { code: Role.CITIZEN } });
    if (!citizenRole) {
      // Thiếu dữ liệu seed — lỗi vận hành, không phải lỗi người dùng
      throw AppException.internal('Thiếu role CITIZEN — hãy chạy migration seed');
    }

    const user = this.userRepo.create({
      email,
      passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
      fullName: dto.fullName.trim(),
      phone: dto.phone ?? null,
      status: UserStatus.ACTIVE,
      roles: [citizenRole],
    });
    const saved = await this.userRepo.save(user);
    this.logger.log(`Đăng ký tài khoản mới: ${saved.id}`);
    void this.auditLog.record('REGISTER', { actorUserId: saved.id, resourceType: 'user', resourceId: saved.id });

    return { user: this.toSafeUser(saved), tokens: await this.issueTokens(saved) };
  }

  /** Đăng nhập bằng email + mật khẩu */
  async login(dto: LoginDto): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email }, relations: { roles: true } });

    // Thông điệp chung cho mọi trường hợp sai — không tiết lộ email có tồn tại hay không
    if (!user?.passwordHash || !(await compare(dto.password, user.passwordHash))) {
      void this.auditLog.record('LOGIN_FAILED', { metadata: { email } });
      throw AppException.unauthorized('Email hoặc mật khẩu không đúng');
    }
    if (user.status !== UserStatus.ACTIVE) {
      void this.auditLog.record('LOGIN_FAILED', {
        actorUserId: user.id,
        resourceType: 'user',
        resourceId: user.id,
        metadata: { reason: 'account_not_active', status: user.status },
      });
      throw AppException.forbidden('Tài khoản đã bị khóa hoặc vô hiệu hóa');
    }

    void this.auditLog.record('LOGIN', { actorUserId: user.id, resourceType: 'user', resourceId: user.id });
    return { user: this.toSafeUser(user), tokens: await this.issueTokens(user) };
  }

  /** Cấp lại cặp token (rotation: thu hồi refresh token cũ, phát token mới) */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenRow = await this.refreshTokenRepo.findOne({
      where: {
        tokenHash: this.hashToken(refreshToken),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: { roles: true } },
    });

    // Token không tồn tại/hết hạn/đã thu hồi, hoặc user đã bị soft delete
    if (!tokenRow?.user || tokenRow.user.status !== UserStatus.ACTIVE) {
      throw AppException.unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    tokenRow.revokedAt = new Date();
    await this.refreshTokenRepo.save(tokenRow);

    return this.issueTokens(tokenRow.user);
  }

  /** Đăng xuất — thu hồi refresh token hiện tại của user */
  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, tokenHash: this.hashToken(refreshToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    void this.auditLog.record('LOGOUT', { actorUserId: userId, resourceType: 'user', resourceId: userId });
  }

  /** Thu hồi TOÀN BỘ refresh token của user (xóa tài khoản/đổi mật khẩu) */
  async revokeAllTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  /** Đổi mật khẩu (đã đăng nhập, biết mật khẩu hiện tại) — thu hồi mọi phiên khác để bảo mật */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.passwordHash || !(await compare(dto.currentPassword, user.passwordHash))) {
      throw AppException.unauthorized('Mật khẩu hiện tại không đúng');
    }

    user.passwordHash = await hash(dto.newPassword, BCRYPT_ROUNDS);
    user.updatedBy = userId;
    await this.userRepo.save(user);
    await this.revokeAllTokens(userId);
    this.logger.log(`User ${userId} da doi mat khau`);
    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  /**
   * Yêu cầu đặt lại mật khẩu — PLACEHOLDER: chưa tích hợp dịch vụ gửi email.
   * Luôn trả cùng một thông điệp bất kể email có tồn tại hay không (chống dò email).
   * Ở môi trường development/test, trả kèm token trong response để có thể test
   * end-to-end mà không cần email thật; ở production KHÔNG bao giờ lộ token qua API
   * (chỉ ghi log server — khi tích hợp email thật ở Prompt sau sẽ gửi qua email thay vì log).
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; devToken?: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email } });
    const message = 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.';

    if (!user) {
      return { message };
    }

    const resetToken = randomBytes(32).toString('hex');
    user.resetTokenHash = this.hashToken(resetToken);
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.userRepo.save(user);

    if (this.appEnv === Environment.Production) {
      // TODO(email): gửi resetToken qua email thay vì log khi có dịch vụ email thật
      this.logger.log(`Reset password duoc yeu cau cho user ${user.id} (token da tao, cho tich hop email)`);
      return { message };
    }

    this.logger.log(`[DEV] Reset token cho ${email}: ${resetToken}`);
    return { message, devToken: resetToken };
  }

  /** Đặt lại mật khẩu bằng token nhận từ forgotPassword */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const user = await this.userRepo.findOne({ where: { resetTokenHash: tokenHash } });

    if (!user?.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw AppException.badRequest('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    user.passwordHash = await hash(dto.newPassword, BCRYPT_ROUNDS);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await this.userRepo.save(user);
    await this.revokeAllTokens(user.id);
    this.logger.log(`User ${user.id} da dat lai mat khau qua token`);
    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  /** Phát hành cặp access + refresh token */
  private async issueTokens(user: UserEntity): Promise<TokenPair> {
    const roles = (user.roles ?? []).map((r) => r.code);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      roles,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.authConfig.refreshExpiresDays * 24 * 60 * 60 * 1000,
    );
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      }),
    );

    return { accessToken, refreshToken, accessExpiresIn: this.authConfig.accessExpiresIn };
  }

  /** SHA-256 hash refresh token trước khi lưu DB */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Loại bỏ trường nhạy cảm khỏi user trước khi trả về client */
  private toSafeUser(user: UserEntity): SafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      roles: (user.roles ?? []).map((r) => r.code),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
