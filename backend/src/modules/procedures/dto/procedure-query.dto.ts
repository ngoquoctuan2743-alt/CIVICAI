import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

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
}
