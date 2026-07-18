import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Tham số tra cứu hội thoại của tôi */
export class ConversationQueryDto extends PaginationQueryDto {
  /** Tìm theo tiêu đề hội thoại */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
