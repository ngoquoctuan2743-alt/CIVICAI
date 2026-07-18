import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { AgencyLevel } from '../../../database/entities/enums';

/** Dữ liệu tạo mới cơ quan nhà nước (ADMIN) */
export class CreateAgencyDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'code không được để trống' })
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'name không được để trống' })
  @MaxLength(255)
  name: string;

  @IsEnum(AgencyLevel, {
    message: `level phải là một trong: ${Object.values(AgencyLevel).join(', ')}`,
  })
  level: AgencyLevel;

  @IsOptional()
  @IsUUID(undefined, { message: 'parentId phải là UUID' })
  parentId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'adminUnitId phải là UUID' })
  adminUnitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail(undefined, { message: 'email không hợp lệ' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsUrl(undefined, { message: 'website phải là URL hợp lệ' })
  @MaxLength(255)
  website?: string;
}
