import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from './base.entity';
import { ConversationChannel, ConversationStatus } from './enums';
import { MessageEntity } from './message.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng conversations — phiên hội thoại giữa người dân và AI (theo dõi hội thoại).
 */
@Entity('conversations')
export class ConversationEntity extends AuditableEntity {
  @Index('idx_conversations_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /** Tiêu đề — tự sinh từ câu hỏi đầu tiên */
  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({
    type: 'enum',
    enum: ConversationChannel,
    enumName: 'conversation_channel',
    default: ConversationChannel.CHAT,
  })
  channel: ConversationChannel;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    enumName: 'conversation_status',
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @OneToMany(() => MessageEntity, (m) => m.conversation)
  messages: MessageEntity[];
}
