import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AgencyLevel } from '../../../database/entities/enums';

/** Tham số tra cứu cơ quan nhà nước */
export class AgencyQueryDto extends PaginationQueryDto {
  /** Tìm theo tên hoặc mã cơ quan (không phân biệt hoa thường) */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsEnum(AgencyLevel, {
    message: `level phải là một trong: ${Object.values(AgencyLevel).join(', ')}`,
  })
  level?: AgencyLevel;
}
