import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { ChunkProcessingStatus } from './enums';
import { KnowledgeDocumentVersionEntity } from './knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng chunk_processing_jobs — theo dõi vòng đời xử lý parsing & chunking
 * của 1 document version (Prompt 03). Đóng vai trò "hàng đợi bền" (durable
 * queue) — hàng đợi thật thi hành in-process (không Redis/BullMQ, xem
 * `chunk-processing-queue.service.ts`), nhưng TRẠNG THÁI luôn nằm ở đây
 * (Postgres) để không mất thông tin khi server restart giữa chừng.
 */
@Entity('chunk_processing_jobs')
export class ChunkProcessingJobEntity extends BaseDbEntity {
  @Index('idx_cpjob_document')
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => KnowledgeDocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KnowledgeDocumentEntity;

  @Index('idx_cpjob_version')
  @Column({ name: 'document_version_id', type: 'uuid' })
  documentVersionId: string;

  @ManyToOne(() => KnowledgeDocumentVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_version_id' })
  documentVersion: KnowledgeDocumentVersionEntity;

  @Index('idx_cpjob_status')
  @Column({
    type: 'enum',
    enum: ChunkProcessingStatus,
    enumName: 'chunk_processing_status',
    default: ChunkProcessingStatus.QUEUED,
  })
  status: ChunkProcessingStatus;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'integer', default: 3 })
  maxAttempts: number;

  @Column({ name: 'error_reason', type: 'text', nullable: true })
  errorReason: string | null;

  @Column({ name: 'chunks_produced', type: 'integer', nullable: true })
  chunksProduced: number | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ name: 'queued_at', type: 'timestamptz', default: () => 'now()' })
  queuedAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /** Người kích hoạt (reparse thủ công) — null nếu tự động enqueue lúc upload */
  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by' })
  requester: UserEntity | null;
}
