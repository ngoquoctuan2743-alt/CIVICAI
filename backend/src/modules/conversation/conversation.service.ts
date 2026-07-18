import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ConversationEntity } from '../../database/entities/conversation.entity';
import {
  ConversationChannel,
  MessageContentType,
  MessageSenderRole,
} from '../../database/entities/enums';
import { FeedbackEntity } from '../../database/entities/feedback.entity';
import { MessageEntity } from '../../database/entities/message.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { AiChatHistoryItem } from '../ai-client/ai-client.types';
import { AiClientService } from '../ai-client/ai-client.service';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { RenameConversationDto } from './dto/rename-conversation.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

/** Độ dài tối đa của tiêu đề tự sinh từ tin nhắn đầu tiên */
const AUTO_TITLE_MAX_LENGTH = 80;

/** Số tin nhắn gần nhất gửi kèm cho AI làm ngữ cảnh (AI Service tự cắt tiếp nếu cần) */
const HISTORY_LIMIT = 20;

/**
 * ConversationService — Chat Workflow hoàn chỉnh (PHASE 4, NHIỆM VỤ 5):
 * Lưu tin nhắn USER -> gọi AI Service (định tuyến theo channel CHAT/VOICE)
 * -> lưu tin nhắn ASSISTANT kèm metadata (sources/intent/...) -> Feedback.
 */
@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepo: Repository<FeedbackEntity>,
    private readonly aiClient: AiClientService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ConversationService.name);
  }

  /** Tạo phiên hội thoại mới */
  async create(userId: string, dto: CreateConversationDto): Promise<ConversationEntity> {
    const conversation = this.conversationRepo.create({
      userId,
      title: dto.title ?? null,
      channel: dto.channel ?? ConversationChannel.CHAT,
      createdBy: userId,
    });
    return this.conversationRepo.save(conversation);
  }

  /** Lịch sử hội thoại của user (mới nhất trước) — có thể tìm theo tiêu đề */
  async findMine(userId: string, query: ConversationQueryDto) {
    const qb = this.conversationRepo
      .createQueryBuilder('conversation')
      .where('conversation.userId = :userId', { userId })
      .orderBy('conversation.updatedAt', 'DESC');

    if (query.search) {
      qb.andWhere('conversation.title ILIKE :search', { search: `%${query.search}%` });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }

  /** Đổi tên hội thoại (kiểm tra quyền sở hữu) */
  async rename(userId: string, conversationId: string, dto: RenameConversationDto) {
    const conversation = await this.findOwnedConversation(userId, conversationId);
    conversation.title = dto.title;
    conversation.updatedBy = userId;
    return this.conversationRepo.save(conversation);
  }

  /** Xóa hội thoại (soft delete, kiểm tra quyền sở hữu) */
  async remove(userId: string, conversationId: string): Promise<{ message: string }> {
    await this.findOwnedConversation(userId, conversationId);
    await this.conversationRepo.softDelete({ id: conversationId });
    this.logger.log(`Conversation ${conversationId} da bi xoa boi user ${userId}`);
    return { message: 'Đã xóa hội thoại' };
  }

  /** Danh sách tin nhắn của một hội thoại (kiểm tra quyền sở hữu) */
  async getMessages(userId: string, conversationId: string, query: PaginationQueryDto) {
    await this.findOwnedConversation(userId, conversationId);

    const [items, total] = await this.messageRepo.findAndCount({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items, total, page: query.page, limit: query.limit };
  }

  /**
   * Lưu tin nhắn người dân, gọi AI trả lời (RAG/Intent), lưu tin nhắn AI.
   * Nếu AI Service lỗi: tin nhắn người dùng VẪN được lưu (không mất dữ liệu),
   * trả về `aiError` để Frontend hiển thị thông báo thân thiện — không văng lỗi
   * cả request (đúng tinh thần NHIỆM VỤ 7 "không làm ứng dụng bị dừng").
   */
  async addMessage(userId: string, conversationId: string, dto: CreateMessageDto) {
    const conversation = await this.findOwnedConversation(userId, conversationId);

    const userMessage = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderRole: MessageSenderRole.USER,
        content: dto.content,
        contentType: dto.contentType ?? MessageContentType.TEXT,
      }),
    );

    if (!conversation.title) {
      conversation.title = dto.content.slice(0, AUTO_TITLE_MAX_LENGTH);
    }
    await this.conversationRepo.save(conversation);

    let assistantMessage: MessageEntity | null = null;
    let aiError: string | null = null;
    try {
      const history = await this.buildHistory(conversationId);
      const aiResponse =
        conversation.channel === ConversationChannel.VOICE
          ? await this.aiClient.voice(dto.content, history)
          : await this.aiClient.chat(dto.content, history);

      assistantMessage = await this.messageRepo.save(
        this.messageRepo.create({
          conversationId,
          senderRole: MessageSenderRole.ASSISTANT,
          content: aiResponse.answer,
          contentType: MessageContentType.TEXT,
          metadata: {
            sources: aiResponse.sources,
            confidence: aiResponse.confidence,
            intent: aiResponse.intent,
            relatedProcedures: aiResponse.relatedProcedures,
            relatedLaws: aiResponse.relatedLaws,
            agencies: aiResponse.agencies,
            suggestedActions: aiResponse.suggestedActions,
            speakable: aiResponse.speakable,
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `AI khong tra loi duoc cho conversation ${conversationId}: ${(error as Error).message}`,
      );
      aiError = 'Trợ lý AI hiện không phản hồi được. Vui lòng thử lại sau ít phút.';
    }

    return { userMessage, assistantMessage, aiError };
  }

  /** Ghi nhận đánh giá 👍/👎 cho một tin nhắn AI (upsert — sửa được đánh giá cũ) */
  async submitFeedback(
    userId: string,
    conversationId: string,
    messageId: string,
    dto: SubmitFeedbackDto,
  ): Promise<FeedbackEntity> {
    await this.findOwnedConversation(userId, conversationId);

    const message = await this.messageRepo.findOne({ where: { id: messageId, conversationId } });
    if (!message) {
      throw AppException.notFound('Không tìm thấy tin nhắn trong hội thoại này');
    }
    if (message.senderRole !== MessageSenderRole.ASSISTANT) {
      throw AppException.badRequest('Chỉ có thể đánh giá tin nhắn trả lời của AI');
    }

    const existing = await this.feedbackRepo.findOne({ where: { messageId, userId } });
    if (existing) {
      existing.rating = dto.rating;
      existing.comment = dto.comment ?? null;
      return this.feedbackRepo.save(existing);
    }

    return this.feedbackRepo.save(
      this.feedbackRepo.create({ messageId, userId, rating: dto.rating, comment: dto.comment ?? null }),
    );
  }

  /** Lấy N tin nhắn gần nhất, chuyển sang định dạng lịch sử gửi cho AI Service */
  private async buildHistory(conversationId: string): Promise<AiChatHistoryItem[]> {
    const recent = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: HISTORY_LIMIT,
    });
    return recent
      .reverse()
      .filter((m) => m.senderRole !== MessageSenderRole.SYSTEM)
      .map((m) => ({
        role: m.senderRole === MessageSenderRole.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));
  }

  /** Lấy hội thoại và xác minh thuộc về user hiện tại */
  private async findOwnedConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationEntity> {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw AppException.notFound('Không tìm thấy hội thoại');
    }
    if (conversation.userId !== userId) {
      throw AppException.forbidden('Hội thoại không thuộc về bạn');
    }
    return conversation;
  }
}
