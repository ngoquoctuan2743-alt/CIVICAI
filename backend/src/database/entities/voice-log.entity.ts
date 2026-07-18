import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { ConversationEntity } from './conversation.entity';
import { MessageEntity } from './message.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng voice_logs — thống kê/audit lượt sử dụng kênh giọng nói.
 * STT/TTS thực hiện phía trình duyệt (Web Speech API — kiến trúc đã chốt Phase 3);
 * bảng này KHÔNG lưu audio thô (đã có ở documents nếu người dùng đính kèm ghi âm),
 * chỉ ghi nhận transcript + số liệu phục vụ theo dõi chất lượng nhận diện giọng nói.
 */
@Entity('voice_logs')
export class VoiceLogEntity extends BaseDbEntity {
  @Index('idx_voice_logs_user')
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;

  @Index('idx_voice_logs_conversation')
  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId: string | null;

  @ManyToOne(() => ConversationEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ConversationEntity | null;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @ManyToOne(() => MessageEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'message_id' })
  message: MessageEntity | null;

  /** Độ dài đoạn ghi âm (mili-giây) — do trình duyệt báo về */
  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  /** Văn bản STT nhận diện được */
  @Column({ type: 'text', nullable: true })
  transcript: string | null;

  /** Độ tin cậy nhận diện (0-1) do Web Speech API trả về, null nếu trình duyệt không hỗ trợ */
  @Column({ type: 'real', nullable: true })
  confidence: number | null;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;
}
