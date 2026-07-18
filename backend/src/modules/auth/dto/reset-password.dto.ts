import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Dữ liệu đặt lại mật khẩu bằng token nhận từ forgot-password */
export class ResetPasswordDto extends BaseDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số',
  })
  newPassword: string;
}
