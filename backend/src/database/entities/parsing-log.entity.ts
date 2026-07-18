import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChunkProcessingJobEntity } from './chunk-processing-job.entity';
import { ParsingLogLevel } from './enums';

/**
 * Bảng parsing_logs — nhật ký chi tiết theo từng job (Observability, Prompt
 * 03). Append-only (không update/xóa), khác với `audit_logs` (Phase 8) vốn
 * dùng cho hành động NGƯỜI DÙNG chủ động — đây là log HỆ THỐNG tự sinh
 * trong lúc xử lý (thời lượng, cảnh báo parser, lỗi...), field khác nhau
 * hẳn nên tách bảng riêng thay vì tái dùng AuditLogEntity.
 */
@Entity('parsing_logs')
export class ParsingLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_parsinglog_job')
  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne(() => ChunkProcessingJobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: ChunkProcessingJobEntity;

  @Column({
    type: 'enum',
    enum: ParsingLogLevel,
    enumName: 'parsing_log_level',
    default: ParsingLogLevel.INFO,
  })
  level: ParsingLogLevel;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
