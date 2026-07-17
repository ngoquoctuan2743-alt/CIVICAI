import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Cập nhật thông tin cơ bản của tài khoản */
export class UpdateProfileDto extends BaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}
