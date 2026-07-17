import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { Gender } from '../../../database/entities/enums';

/**
 * Dữ liệu tạo/cập nhật hồ sơ công dân.
 * Địa phương theo mô hình 2 cấp: province (tỉnh/thành) + ward (xã/phường).
 */
export class UpsertCitizenProfileDto extends BaseDto {
  /** Số CCCD 12 chữ số */
  @IsOptional()
  @Matches(/^\d{12}$/, { message: 'Số CCCD phải gồm đúng 12 chữ số' })
  nationalId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh phải theo định dạng YYYY-MM-DD' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender, { message: `Giới tính phải là một trong: ${Object.values(Gender).join(', ')}` })
  gender?: Gender;

  @IsOptional()
  @IsUUID(undefined, { message: 'provinceId phải là UUID' })
  provinceId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'wardId phải là UUID' })
  wardId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressDetail?: string;
}
