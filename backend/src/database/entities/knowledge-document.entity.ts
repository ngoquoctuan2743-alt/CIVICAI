import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from './base.entity';
import { GovernmentAgencyEntity } from './government-agency.entity';
import { KnowledgeDocumentCategory, KnowledgeDocumentVersionStatus } from './enums';
import { KnowledgeDocumentTagEntity } from './knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from './knowledge-document-version.entity';

/**
 * Bảng knowledge_documents — tài liệu nạp vào kho tri thức RAG (luật, thủ tục,
 * FAQ, thông tư, nghị định, biểu mẫu...) dưới dạng FILE tải lên, khác với
 * `documents` (bảng file đơn lẻ dùng cho OCR/chat-attachment/avatar — không
 * có versioning). Đây là entity "logic" — nội dung file thật nằm ở các dòng
 * `knowledge_document_versions` con; `activeVersionId` trỏ tới version đang
 * dùng để retrieval/embedding (Prompt 03+, KHÔNG xử lý ở đây).
 */
@Entity('knowledge_documents')
export class KnowledgeDocumentEntity extends AuditableEntity {
  @Index('idx_kdoc_title')
  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Index('idx_kdoc_category')
  @Column({
    type: 'enum',
    enum: KnowledgeDocumentCategory,
    enumName: 'knowledge_document_category',
  })
  category: KnowledgeDocumentCategory;

  /** Nguồn gốc tài liệu, vd "Cổng thông tin Chính phủ", "Cán bộ soạn thảo" — tự do, không quản lý danh mục riêng */
  @Column({ type: 'varchar', length: 255, nullable: true })
  source: string | null;

  /** Mã ngôn ngữ ISO 639-1, mặc định tiếng Việt */
  @Column({ type: 'varchar', length: 10, default: 'vi' })
  language: string;

  @Index('idx_kdoc_agency')
  @Column({ name: 'agency_id', type: 'uuid', nullable: true })
  agencyId: string | null;

  @ManyToOne(() => GovernmentAgencyEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agency_id' })
  agency: GovernmentAgencyEntity | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Version hiện hành — null nếu chưa version nào READY (vd vừa tạo document, đang xử lý) */
  @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
  activeVersionId: string | null;

  @ManyToOne(() => KnowledgeDocumentVersionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'active_version_id' })
  activeVersion: KnowledgeDocumentVersionEntity | null;

  /**
   * Trạng thái tổng hợp — bản sao (denormalized) của status version hiện tại,
   * được KnowledgeDocumentsService đồng bộ mỗi khi version đổi trạng thái.
   * Mục đích: liệt kê/lọc danh sách document không cần JOIN sang version.
   * Nguồn sự thật (source of truth) vẫn là status trên từng version.
   */
  @Index('idx_kdoc_status')
  @Column({
    type: 'enum',
    enum: KnowledgeDocumentVersionStatus,
    enumName: 'knowledge_document_version_status',
    default: KnowledgeDocumentVersionStatus.NEW,
  })
  status: KnowledgeDocumentVersionStatus;

  @OneToMany(() => KnowledgeDocumentVersionEntity, (v) => v.document)
  versions: KnowledgeDocumentVersionEntity[];

  @OneToMany(() => KnowledgeDocumentTagEntity, (t) => t.document)
  tags: KnowledgeDocumentTagEntity[];
}
