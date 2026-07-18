import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceLogEntity } from '../../database/entities/voice-log.entity';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

/** Module Voice — placeholder cho STT/TTS phía server (xem ghi chú VoiceService) */
@Module({
  imports: [TypeOrmModule.forFeature([VoiceLogEntity])],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
