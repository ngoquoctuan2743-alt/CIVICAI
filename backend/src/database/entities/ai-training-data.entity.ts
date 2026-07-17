import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { FeedbackEntity } from './feedback.entity';
import { TrainingDataSource, TrainingDataStatus } from './enums';

/**
 * Bảng ai_training_data — dữ liệu cải thiện AI (Feedback Learning).
 * Thu thập từ feedback 👎 (câu trả lời cần sửa) hoặc nhập tay,
 * duyệt xong dùng để tinh chỉnh prompt / bổ sung kho tri thức.
 */
@Entity('ai_training_data')
export class AiTrainingDataEntity extends BaseDbEntity {
  @Index('idx_ai_training_data_source')
  @Column({
    name: 'source_type',
    type: 'enum',
    enum: TrainingDataSource,
    enumName: 'training_data_source',
  })
  sourceType: TrainingDataSource;

  /** Câu hỏi / đầu vào của người dân */
  @Column({ name: 'input_text', type: 'text' })
  inputText: string;

  /** Câu trả lời đúng mong muốn (do người duyệt bổ sung) */
  @Column({ name: 'expected_output', type: 'text', nullable: true })
  expectedOutput: string | null;

  /** Feedback gốc sinh ra bản ghi này (nếu nguồn = FEEDBACK) */
  @Column({ name: 'feedback_id', type: 'uuid', nullable: true })
  feedbackId: string | null;

  @ManyToOne(() => FeedbackEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'feedback_id' })
  feedback: FeedbackEntity | null;

  @Index('idx_ai_training_data_status')
  @Column({
    type: 'enum',
    enum: TrainingDataStatus,
    enumName: 'training_data_status',
    default: TrainingDataStatus.PENDING,
  })
  status: TrainingDataStatus;

  /** Ghi chú của người duyệt */
  @Column({ name: 'review_note', type: 'varchar', length: 1000, nullable: true })
  reviewNote: string | null;
}
