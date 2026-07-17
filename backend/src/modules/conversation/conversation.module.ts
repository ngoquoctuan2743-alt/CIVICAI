import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationEntity } from '../../database/entities/conversation.entity';
import { FeedbackEntity } from '../../database/entities/feedback.entity';
import { MessageEntity } from '../../database/entities/message.entity';
import { AiClientModule } from '../ai-client/ai-client.module';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';

/** Module hội thoại — tích hợp AI thật (PHASE 4) */
@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity, MessageEntity, FeedbackEntity]),
    AiClientModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
