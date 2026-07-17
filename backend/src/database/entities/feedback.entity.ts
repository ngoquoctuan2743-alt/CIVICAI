import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { MessageEntity } from './message.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng feedbacks — người dân đánh giá câu trả lời của AI (👍 = 1 / 👎 = -1).
 * Mỗi người chỉ đánh giá một lần trên một tin nhắn (unique).
 */
@Entity('feedbacks')
@Unique('uq_feedbacks_message_user', ['messageId', 'userId'])
export class FeedbackEntity extends BaseDbEntity {
  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @ManyToOne(() => MessageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: MessageEntity;

  @Index('idx_feedbacks_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /** 1 = hữu ích 👍, -1 = chưa chính xác 👎 */
  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  comment: string | null;
}
