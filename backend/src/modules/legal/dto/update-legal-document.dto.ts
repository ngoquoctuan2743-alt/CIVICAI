import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { LegalDocStatus, LegalDocType } from '../../../database/entities/enums';

/** Dữ liệu cập nhật văn bản pháp luật (ADMIN) — chỉ ghi đè field được gửi lên */
export class UpdateLegalDocumentDto extends BaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'code không được để trống' })
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'title không được để trống' })
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsEnum(LegalDocType, {
    message: `docType phải là một trong: ${Object.values(LegalDocType).join(', ')}`,
  })
  docType?: LegalDocType;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'issuingBody không được để trống' })
  @MaxLength(255)
  issuingBody?: string;

  @IsOptional()
  @IsDateString({}, { message: 'issuedDate phải theo định dạng YYYY-MM-DD' })
  issuedDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'effectiveDate phải theo định dạng YYYY-MM-DD' })
  effectiveDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'expiryDate phải theo định dạng YYYY-MM-DD' })
  expiryDate?: string;

  @IsOptional()
  @IsEnum(LegalDocStatus, {
    message: `status phải là một trong: ${Object.values(LegalDocStatus).join(', ')}`,
  })
  status?: LegalDocStatus;

  @IsOptional()
  @IsUrl(undefined, { message: 'sourceUrl phải là URL hợp lệ' })
  @MaxLength(500)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
