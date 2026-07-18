import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { KnowledgeDocumentVersionStatus } from './enums';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng knowledge_document_versions — MỘT phiên bản file thật của một
 * knowledge_document. Append-only theo thiết kế: một version, khi đã tạo,
 * KHÔNG bị sửa nội dung file/hash (chỉ status được cập nhật khi xử lý xong).
 * "Never overwrite previous versions" — version cũ luôn giữ lại, không xóa
 * khi có version mới; KnowledgeDocument.activeVersionId quyết định version
 * nào đang được dùng.
 */
@Entity('knowledge_document_versions')
export class KnowledgeDocumentVersionEntity extends BaseDbEntity {
  @Index('idx_kdocver_document')
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => KnowledgeDocumentEntity, (d) => d.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KnowledgeDocumentEntity;

  /** Số thứ tự version trong phạm vi 1 document: 1, 2, 3... */
  @Column({ name: 'version_number', type: 'integer' })
  versionNumber: number;

  /** Khóa định danh file trên storage — không trùng */
  @Column({ name: 'storage_key', type: 'varchar', length: 500, unique: true })
  storageKey: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  /** SHA-256 hex của nội dung file — phát hiện trùng lặp (duplicate detection) */
  @Index('idx_kdocver_hash')
  @Column({ name: 'file_hash', type: 'varchar', length: 64 })
  fileHash: string;

  @Index('idx_kdocver_status')
  @Column({
    type: 'enum',
    enum: KnowledgeDocumentVersionStatus,
    enumName: 'knowledge_document_version_status',
    default: KnowledgeDocumentVersionStatus.NEW,
  })
  status: KnowledgeDocumentVersionStatus;

  /** Lý do lỗi khi status = FAILED */
  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: UserEntity | null;
}
