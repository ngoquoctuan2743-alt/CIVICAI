import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Dữ liệu đăng nhập */
export class LoginDto extends BaseDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
