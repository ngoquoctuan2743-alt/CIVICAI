import { Body, Controller, Delete, Get, Patch, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
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

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload ảnh đại diện' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(user.userId, file);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Đổi mật khẩu (biết mật khẩu hiện tại, thu hồi các phiên khác)' })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Xóa tài khoản (soft delete, thu hồi mọi phiên)' })
  deleteAccount(@CurrentUser() user: AuthUser) {
    return this.usersService.deleteAccount(user.userId);
  }
}
