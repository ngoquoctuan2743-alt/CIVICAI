import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ErrorCode } from '../../common/constants/error-code.constants';
import { CitizenProfileEntity } from '../../database/entities/citizen-profile.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';

/** Unit test UsersService — repo và AuthService được mock */
describe('UsersService', () => {
  let service: UsersService;

  const userRepo = { findOne: jest.fn(), save: jest.fn(), softDelete: jest.fn() };
  const profileRepo = { findOne: jest.fn() };
  const authService = { revokeAllTokens: jest.fn() };
  const logger = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const baseUser = {
    id: 'user-1',
    email: 'a@b.com',
    fullName: 'Nguyễn Văn A',
    phone: null,
    status: 'ACTIVE',
    roles: [{ code: 'CITIZEN' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(CitizenProfileEntity), useValue: profileRepo },
        { provide: AuthService, useValue: authService },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('getProfile: trả tài khoản + citizenProfile + ngày tạo/cập nhật', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);
    profileRepo.findOne.mockResolvedValue({ id: 'profile-1', nationalId: '012345678901' });

    const result = await service.getProfile('user-1');

    expect(result.email).toBe('a@b.com');
    expect(result.roles).toEqual(['CITIZEN']);
    expect(result.citizenProfile).toMatchObject({ id: 'profile-1' });
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('getProfile: user không tồn tại -> NOT_FOUND', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.getProfile('khong-co')).rejects.toMatchObject({
      errorCode: ErrorCode.NOT_FOUND,
    });
  });

  it('updateProfile: chỉ ghi đè trường được gửi', async () => {
    userRepo.findOne.mockResolvedValue({ ...baseUser });
    profileRepo.findOne.mockResolvedValue(null);
    userRepo.save.mockResolvedValue({});

    await service.updateProfile('user-1', { fullName: '  Trần B  ' } as never);

    const saved = userRepo.save.mock.calls[0][0];
    expect(saved.fullName).toBe('Trần B'); // đã trim
    expect(saved.phone).toBeNull(); // không đổi
  });

  it('deleteAccount: thu hồi toàn bộ token rồi soft delete', async () => {
    userRepo.findOne.mockResolvedValue(baseUser);

    await service.deleteAccount('user-1');

    expect(authService.revokeAllTokens).toHaveBeenCalledWith('user-1');
    expect(userRepo.softDelete).toHaveBeenCalledWith({ id: 'user-1' });
  });
});
