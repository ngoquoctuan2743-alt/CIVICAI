import { IsEmail, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Dữ liệu yêu cầu đặt lại mật khẩu (chưa đăng nhập) */
export class ForgotPasswordDto extends BaseDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email: string;
}
