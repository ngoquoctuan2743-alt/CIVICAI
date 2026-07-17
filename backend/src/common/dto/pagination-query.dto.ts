import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/app.constants';
import { BaseDto } from './base.dto';

/**
 * DTO phân trang dùng chung cho mọi endpoint danh sách.
 * Ví dụ: GET /items?page=2&limit=50
 *
 * Đây cũng là DTO mẫu minh họa quy ước validation của dự án.
 */
export class PaginationQueryDto extends BaseDto {
  /** Trang hiện tại (bắt đầu từ 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page tối thiểu là 1' })
  page: number = DEFAULT_PAGE;

  /** Số bản ghi mỗi trang */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(MAX_PAGE_SIZE, { message: `limit tối đa là ${MAX_PAGE_SIZE}` })
  limit: number = DEFAULT_PAGE_SIZE;
}
