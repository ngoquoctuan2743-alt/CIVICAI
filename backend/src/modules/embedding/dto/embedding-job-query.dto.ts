import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EmbeddingJobStatus } from '../../../database/entities/enums';

/** Tham số lọc danh sách job embedding (Admin) */
export class EmbeddingJobQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'documentId phải là UUID' })
  documentId?: string;

  @IsOptional()
  @IsEnum(EmbeddingJobStatus, {
    message: `status phải là một trong: ${Object.values(EmbeddingJobStatus).join(', ')}`,
  })
  status?: EmbeddingJobStatus;
}
