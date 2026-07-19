import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { EmbeddingJobStatus } from './enums';
import { KnowledgeDocumentVersionEntity } from './knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng embedding_jobs — 1 job = embed HÀNG LOẠT toàn bộ chunk READY của 1
 * document version (Batch processing) — không phải 1 job/1 chunk, khớp
 * pipeline "READY_CHUNK -> Queue -> Embedding Worker" xử lý theo lô.
 * `embeddedCount`/`failedCount` cho phép Resume (biết đã xong bao nhiêu,
 * job mới chỉ cần xử lý chunk CHƯA có embedding READY).
 */
@Entity('embedding_jobs')
export class EmbeddingJobEntity extends BaseDbEntity {
  @Index('idx_embjob_document')
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => KnowledgeDocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KnowledgeDocumentEntity;

  @Index('idx_embjob_version')
  @Column({ name: 'document_version_id', type: 'uuid' })
  documentVersionId: string;

  @ManyToOne(() => KnowledgeDocumentVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_version_id' })
  documentVersion: KnowledgeDocumentVersionEntity;

  @Column({ name: 'embedding_model', type: 'varchar', length: 50 })
  embeddingModel: string;

  @Column({ name: 'embedding_model_version', type: 'varchar', length: 100 })
  embeddingModelVersion: string;

  @Index('idx_embjob_status')
  @Column({
    type: 'enum',
    enum: EmbeddingJobStatus,
    enumName: 'embedding_job_status',
    default: EmbeddingJobStatus.QUEUED,
  })
  status: EmbeddingJobStatus;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'integer', default: 3 })
  maxAttempts: number;

  @Column({ name: 'total_chunks', type: 'integer', default: 0 })
  totalChunks: number;

  @Column({ name: 'embedded_count', type: 'integer', default: 0 })
  embeddedCount: number;

  @Column({ name: 'failed_count', type: 'integer', default: 0 })
  failedCount: number;

  @Column({ name: 'error_reason', type: 'text', nullable: true })
  errorReason: string | null;

  @Column({ name: 'queued_at', type: 'timestamptz', default: () => 'now()' })
  queuedAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by' })
  requester: UserEntity | null;
}
