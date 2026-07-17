import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from './base.entity';
import { DocumentPurpose, OcrStatus } from './enums';
import { UserEntity } from './user.entity';

/**
 * Bảng documents — metadata mọi file trong hệ thống (ảnh giấy tờ, ghi âm,
 * tài liệu nạp kho tri thức). File vật lý nằm ở storage (local/S3).
 * Kết quả OCR/Document Understanding lưu ngay tại đây (extracted_*).
 */
@Entity('documents')
export class DocumentEntity extends AuditableEntity {
  /** Người tải lên — null với tài liệu hệ thống nạp sẵn */
  @Index('idx_documents_owner')
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity | null;

  /** Khóa định danh file trên storage — không trùng */
  @Column({ name: 'storage_key', type: 'varchar', length: 500, unique: true })
  storageKey: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Index('idx_documents_purpose')
  @Column({ type: 'enum', enum: DocumentPurpose, enumName: 'document_purpose' })
  purpose: DocumentPurpose;

  /** Trạng thái OCR — NONE nếu file không cần OCR */
  @Column({
    name: 'ocr_status',
    type: 'enum',
    enum: OcrStatus,
    enumName: 'ocr_status',
    default: OcrStatus.NONE,
  })
  ocrStatus: OcrStatus;

  /** Văn bản trích xuất từ OCR */
  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText: string | null;

  /** Trường có cấu trúc bóc tách từ giấy tờ, vd: {so_cccd, ho_ten, ngay_sinh} */
  @Column({ name: 'extracted_data', type: 'jsonb', nullable: true })
  extractedData: Record<string, unknown> | null;

  @Column({ name: 'ocr_error', type: 'varchar', length: 500, nullable: true })
  ocrError: string | null;
}
