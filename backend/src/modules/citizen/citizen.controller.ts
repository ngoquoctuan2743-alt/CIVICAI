import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CitizenService } from './citizen.service';
import { UpsertCitizenProfileDto } from './dto/upsert-citizen-profile.dto';

/** API hồ sơ công dân của người dùng đang đăng nhập */
@ApiTags('citizens')
@ApiBearerAuth()
@Controller('citizens')
export class CitizenController {
  constructor(private readonly citizenService: CitizenService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Xem hồ sơ công dân' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.citizenService.getMyProfile(user.userId);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Tạo hồ sơ công dân (mỗi tài khoản một hồ sơ)' })
  createProfile(@CurrentUser() user: AuthUser, @Body() dto: UpsertCitizenProfileDto) {
    return this.citizenService.createProfile(user.userId, dto);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Cập nhật hồ sơ công dân' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpsertCitizenProfileDto) {
    return this.citizenService.updateProfile(user.userId, dto);
  }
}
