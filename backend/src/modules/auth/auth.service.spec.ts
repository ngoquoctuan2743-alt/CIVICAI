import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-code.constants';
import { UserStatus } from '../../database/entities/enums';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { AuthService } from './auth.service';

/** Unit test AuthService — repository và JwtService được mock hoàn toàn */
describe('AuthService', () => {
  let service: AuthService;

  const userRepo = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(),
  };
  const roleRepo = { findOne: jest.fn() };
  const refreshTokenRepo = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(),
    update: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-access-token') };
  const logger = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
  const configService = {
    getOrThrow: jest.fn((key: string) =>
      key === 'app.env'
        ? 'test'
        : { jwtSecret: 'test-secret', accessExpiresIn: '15m', refreshExpiresDays: 7 },
    ),
  };

  const citizenRole: Partial<RoleEntity> = { id: 'role-1', code: 'CITIZEN' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(RoleEntity), useValue: roleRepo },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: refreshTokenRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: AppLoggerService, useValue: logger },
        { provide: AuditLogService, useValue: auditLog },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    const dto = { email: 'Test@Example.com', password: 'MatKhau123', fullName: 'Nguyễn Văn A' };

    it('đăng ký thành công: chuẩn hóa email, gán role CITIZEN, trả token', async () => {
      userRepo.findOne.mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue(citizenRole);
      userRepo.save.mockImplementation((u) =>
        Promise.resolve({
          ...u,
          id: 'user-1',
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.register(dto as never);

      expect(result.user.email).toBe('test@example.com'); // đã lowercase
      expect(result.user.roles).toEqual(['CITIZEN']);
      expect(result.tokens.accessToken).toBe('signed-access-token');
      expect(result.tokens.refreshToken).toHaveLength(96); // 48 bytes hex
      // Mật khẩu không bao giờ được lưu thô
      const savedUser = userRepo.save.mock.calls[0][0];
      expect(savedUser.passwordHash).not.toBe(dto.password);
    });

    it('email đã tồn tại: ném CONFLICT', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto as never)).rejects.toMatchObject({
        errorCode: ErrorCode.CONFLICT,
      });
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('đăng nhập thành công với mật khẩu đúng', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        passwordHash: await hash('MatKhau123', 4),
        fullName: 'A',
        phone: null,
        status: UserStatus.ACTIVE,
        roles: [citizenRole],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login({ email: 'a@b.com', password: 'MatKhau123' } as never);
      expect(result.tokens.accessToken).toBe('signed-access-token');
    });

    it('sai mật khẩu: ném UNAUTHORIZED (thông điệp chung, không lộ thông tin)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        passwordHash: await hash('MatKhauDung1', 4),
        status: UserStatus.ACTIVE,
        roles: [],
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'MatKhauSai1' } as never),
      ).rejects.toMatchObject({ errorCode: ErrorCode.UNAUTHORIZED });
    });

    it('tài khoản BANNED: ném FORBIDDEN', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        passwordHash: await hash('MatKhau123', 4),
        status: UserStatus.BANNED,
        roles: [],
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'MatKhau123' } as never),
      ).rejects.toMatchObject({ errorCode: ErrorCode.FORBIDDEN });
    });
  });

  describe('refresh', () => {
    it('refresh token không tồn tại: ném UNAUTHORIZED', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      await expect(service.refresh('token-la')).rejects.toBeInstanceOf(AppException);
    });

    it('refresh hợp lệ: thu hồi token cũ (rotation) và phát cặp mới', async () => {
      const tokenRow = {
        id: 'rt-1',
        revokedAt: null,
        user: { id: 'user-1', email: 'a@b.com', status: UserStatus.ACTIVE, roles: [citizenRole] },
      };
      refreshTokenRepo.findOne.mockResolvedValue(tokenRow);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.refresh('valid-token');

      expect(tokenRow.revokedAt).not.toBeNull(); // đã bị thu hồi
      expect(result.accessToken).toBe('signed-access-token');
    });
  });
});
