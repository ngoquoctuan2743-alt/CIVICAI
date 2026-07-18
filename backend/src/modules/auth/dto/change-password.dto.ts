import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Dữ liệu đổi mật khẩu (yêu cầu xác thực, biết mật khẩu hiện tại) */
export class ChangePasswordDto extends BaseDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số',
  })
  newPassword: string;
}
