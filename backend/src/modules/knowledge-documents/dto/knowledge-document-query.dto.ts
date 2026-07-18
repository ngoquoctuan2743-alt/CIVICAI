import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  KnowledgeDocumentCategory,
  KnowledgeDocumentVersionStatus,
} from '../../../database/entities/enums';

/** Tham số tìm kiếm/lọc tài liệu kho tri thức (Admin) */
export class KnowledgeDocumentQueryDto extends PaginationQueryDto {
  /** Tìm theo tiêu đề */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  search?: string;

  @IsOptional()
  @IsEnum(KnowledgeDocumentCategory, {
    message: `category phải là một trong: ${Object.values(KnowledgeDocumentCategory).join(', ')}`,
  })
  category?: KnowledgeDocumentCategory;

  @IsOptional()
  @IsEnum(KnowledgeDocumentVersionStatus, {
    message: `status phải là một trong: ${Object.values(KnowledgeDocumentVersionStatus).join(', ')}`,
  })
  status?: KnowledgeDocumentVersionStatus;

  @IsOptional()
  @IsUUID(undefined, { message: 'agencyId phải là UUID' })
  agencyId?: string;

  /** Lọc theo 1 tag */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  /** Bao gồm cả tài liệu đã xóa mềm (mặc định false) — dùng cho màn "Thùng rác" */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'includeDeleted phải là boolean' })
  includeDeleted?: boolean;
}
