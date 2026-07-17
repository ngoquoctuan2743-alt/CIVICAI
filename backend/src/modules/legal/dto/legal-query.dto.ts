import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LegalDocStatus, LegalDocType } from '../../../database/entities/enums';

/** Tham số tra cứu văn bản pháp luật */
export class LegalQueryDto extends PaginationQueryDto {
  /** Tìm theo tiêu đề hoặc số hiệu văn bản */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsEnum(LegalDocType, {
    message: `docType phải là một trong: ${Object.values(LegalDocType).join(', ')}`,
  })
  docType?: LegalDocType;

  @IsOptional()
  @IsEnum(LegalDocStatus, {
    message: `status phải là một trong: ${Object.values(LegalDocStatus).join(', ')}`,
  })
  status?: LegalDocStatus;
}
