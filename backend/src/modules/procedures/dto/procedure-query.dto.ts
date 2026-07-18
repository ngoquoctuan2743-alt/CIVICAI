import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AgencyLevel } from '../../../database/entities/enums';

/** Tham số tra cứu thủ tục hành chính */
export class ProcedureQueryDto extends PaginationQueryDto {
  /** Tìm theo tên hoặc mã thủ tục */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  /** Lọc theo cơ quan thực hiện */
  @IsOptional()
  @IsUUID(undefined, { message: 'agencyId phải là UUID' })
  agencyId?: string;

  /** Lọc theo lĩnh vực, vd: "Hộ tịch", "Cư trú" */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string;

  /** Lọc theo địa phương (tỉnh/thành thực hiện — qua cơ quan) */
  @IsOptional()
  @IsUUID(undefined, { message: 'provinceId phải là UUID' })
  provinceId?: string;

  /** Lọc theo cấp thực hiện (qua cơ quan): CENTRAL/PROVINCE/WARD */
  @IsOptional()
  @IsEnum(AgencyLevel, {
    message: `level phải là một trong: ${Object.values(AgencyLevel).join(', ')}`,
  })
  level?: AgencyLevel;
}
