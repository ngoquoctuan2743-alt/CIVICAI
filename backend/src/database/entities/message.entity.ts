import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { ConversationEntity } from './conversation.entity';
import { DocumentEntity } from './document.entity';
import { MessageContentType, MessageSenderRole } from './enums';

/**
 * Bảng messages — từng lượt tin nhắn trong hội thoại.
 * metadata (jsonb) lưu: nguồn RAG trích dẫn, transcript giọng nói, intent...
 */
@Entity('messages')
@Index('idx_messages_conversation_created', ['conversationId', 'createdAt'])
export class MessageEntity extends BaseDbEntity {
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => ConversationEntity, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ConversationEntity;

  @Column({
    name: 'sender_role',
    type: 'enum',
    enum: MessageSenderRole,
    enumName: 'message_sender_role',
  })
  senderRole: MessageSenderRole;

  @Column({ type: 'text' })
  content: string;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: MessageContentType,
    enumName: 'message_content_type',
    default: MessageContentType.TEXT,
  })
  contentType: MessageContentType;

  /** File đính kèm (ảnh giấy tờ, ghi âm) — trỏ tới bảng documents */
  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId: string | null;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity | null;

  /** Dữ liệu phụ: {sources: [...], intent: "...", stt_transcript: "..."} */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
