import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ChunkProcessingStatus } from '../../../database/entities/enums';

/** Tham số lọc danh sách job xử lý parsing & chunking (Admin) */
export class JobQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'documentId phải là UUID' })
  documentId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'documentVersionId phải là UUID' })
  documentVersionId?: string;

  @IsOptional()
  @IsEnum(ChunkProcessingStatus, {
    message: `status phải là một trong: ${Object.values(ChunkProcessingStatus).join(', ')}`,
  })
  status?: ChunkProcessingStatus;
}
