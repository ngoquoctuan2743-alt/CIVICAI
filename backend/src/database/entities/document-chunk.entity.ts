import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GovernmentAgencyEntity } from './government-agency.entity';
import { KnowledgeDocumentCategory } from './enums';
import { KnowledgeDocumentVersionEntity } from './knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';

/**
 * Bảng document_chunks — chunk sinh ra từ Chunking Engine (Prompt 03), sẵn
 * sàng cho Embedding Pipeline (Prompt 04, KHÔNG triển khai ở đây).
 *
 * QUAN TRỌNG — Idempotency: `id` là DETERMINISTIC (hash từ
 * `documentVersionId:chunkIndex`, xem `chunk-id.util.ts`), KHÔNG dùng
 * `@PrimaryGeneratedColumn` — vì vậy entity này KHÔNG extends BaseDbEntity
 * (base class ép PK auto-generate, không phù hợp yêu cầu "parse 2 lần phải
 * ra cùng chunk ID"). `id` được gán tường minh ở tầng service trước khi save.
 */
@Entity('document_chunks')
@Index('uq_document_chunks_version_index', ['documentVersionId', 'chunkIndex'], { unique: true })
export class DocumentChunkEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_document_chunks_document')
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => KnowledgeDocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KnowledgeDocumentEntity;

  @Index('idx_document_chunks_version')
  @Column({ name: 'document_version_id', type: 'uuid' })
  documentVersionId: string;

  @ManyToOne(() => KnowledgeDocumentVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_version_id' })
  documentVersion: KnowledgeDocumentVersionEntity;

  @Column({ name: 'chunk_index', type: 'integer' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'page_number', type: 'integer', nullable: true })
  pageNumber: number | null;

  @Column({ name: 'section_title', type: 'varchar', length: 500, nullable: true })
  sectionTitle: string | null;

  /** Đường dẫn heading cha -> con dẫn tới chunk này, vd ["Chương I", "Điều 3"] */
  @Column({ name: 'heading_path', type: 'jsonb', default: () => "'[]'" })
  headingPath: string[];

  @Column({ name: 'char_start', type: 'integer' })
  charStart: number;

  @Column({ name: 'char_end', type: 'integer' })
  charEnd: number;

  @Column({ name: 'word_count', type: 'integer' })
  wordCount: number;

  @Column({ type: 'varchar', length: 10 })
  language: string;

  /**
   * Nguồn tạo chunk — hằng số 'KNOWLEDGE_DOCUMENT' cho toàn bộ chunk từ
   * pipeline này (phân biệt với đường ingest khác nếu Prompt 04 cần gộp
   * nhiều nguồn — hiện tại ai-service có 1 đường ingest DB-driven khác,
   * xem docs/rag-architecture-v2.md).
   */
  @Column({ name: 'source_type', type: 'varchar', length: 50, default: 'KNOWLEDGE_DOCUMENT' })
  sourceType: string;

  @Index('idx_document_chunks_category')
  @Column({
    type: 'enum',
    enum: KnowledgeDocumentCategory,
    enumName: 'knowledge_document_category',
  })
  category: KnowledgeDocumentCategory;

  @Column({ name: 'agency_id', type: 'uuid', nullable: true })
  agencyId: string | null;

  @ManyToOne(() => GovernmentAgencyEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agency_id' })
  agency: GovernmentAgencyEntity | null;

  /** Snapshot tag tại thời điểm chunk được tạo (tag của document có thể đổi sau, chunk giữ nguyên để truy vết) */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags: string[];

  /** SHA-256 nội dung chunk (đã chuẩn hóa) — dùng dedup trong 1 version */
  @Index('idx_document_chunks_checksum')
  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
