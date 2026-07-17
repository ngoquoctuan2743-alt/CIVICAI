import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Dữ liệu đăng ký tài khoản công dân */
export class RegisterDto extends BaseDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email: string;

  /** Tối thiểu 8 ký tự, có chữ và số */
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(255)
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}
