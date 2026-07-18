import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Tham số tra cứu feedback (ADMIN) */
export class FeedbackQueryDto extends PaginationQueryDto {
  /** Lọc theo đánh giá: 1 (👍) hoặc -1 (👎) */
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, -1], { message: 'rating phải là 1 hoặc -1' })
  rating?: number;
}
