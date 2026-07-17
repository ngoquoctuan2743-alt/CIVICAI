import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

/** API quản lý tài khoản của chính người dùng đang đăng nhập */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Xem hồ sơ tài khoản (kèm citizen profile)' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Cập nhật họ tên / số điện thoại' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Xóa tài khoản (soft delete, thu hồi mọi phiên)' })
  deleteAccount(@CurrentUser() user: AuthUser) {
    return this.usersService.deleteAccount(user.userId);
  }
}
