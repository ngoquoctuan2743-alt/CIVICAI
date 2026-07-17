import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiClientService } from './ai-client.service';

/**
 * Module HTTP Client tới AI Service — export AiClientService để
 * ConversationModule và DocumentsModule dùng chung.
 */
@Module({
  imports: [HttpModule],
  providers: [AiClientService],
  exports: [AiClientService],
})
export class AiClientModule {}
