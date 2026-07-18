import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { KnowledgeDocumentCategory } from '../../../database/entities/enums';

/**
 * Metadata gửi kèm khi upload tài liệu (multipart/form-data — field text đi
 * cùng field file). Dùng chung cho upload đơn và upload nhiều file (bulk):
 * bulk upload áp cùng 1 metadata cho toàn bộ file trong batch, riêng `title`
 * sẽ bị bỏ qua ở bulk (service tự đặt theo tên file gốc).
 */
export class UploadKnowledgeDocumentDto extends BaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'title không được để trống' })
  @MaxLength(500)
  title?: string;

  @IsEnum(KnowledgeDocumentCategory, {
    message: `category phải là một trong: ${Object.values(KnowledgeDocumentCategory).join(', ')}`,
  })
  category: KnowledgeDocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'agencyId phải là UUID' })
  agencyId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Danh sách tag, dạng chuỗi phân tách bởi dấu phẩy (multipart field là text) — vd "cccd,ho-tich" */
  @IsOptional()
  @IsString()
  tags?: string;
}
