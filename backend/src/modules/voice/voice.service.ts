import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceLogEntity } from '../../database/entities/voice-log.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { SpeechToTextDto } from './dto/speech-to-text.dto';
import { TextToSpeechDto } from './dto/text-to-speech.dto';

/**
 * VoiceService — PLACEHOLDER cho xử lý giọng nói phía server.
 * Luồng Voice thật hiện tại hoàn toàn ở trình duyệt (Web Speech API — kiến trúc
 * đã chốt Phase 3): STT client-side rồi gửi transcript qua
 * `POST /conversations/:id/messages`; TTS đọc câu trả lời AI ngay tại trình duyệt.
 * Service này chỉ mock response + ghi voice_logs (bảng đã có từ PROMPT 17) để có
 * sẵn interface cho khi tích hợp STT/TTS server thật ở Prompt 19+.
 */
@Injectable()
export class VoiceService {
  constructor(
    @InjectRepository(VoiceLogEntity) private readonly voiceLogRepo: Repository<VoiceLogEntity>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(VoiceService.name);
  }

  async speechToText(userId: string, dto: SpeechToTextDto) {
    const transcript = dto.transcript ?? '';
    const confidence = dto.transcript ? 1 : null;

    await this.voiceLogRepo.save(
      this.voiceLogRepo.create({
        userId,
        transcript: transcript || null,
        confidence,
        errorMessage: dto.documentId && !dto.transcript
          ? 'STT server-side chưa tích hợp — chỉ hỗ trợ passthrough transcript từ client'
          : null,
      }),
    );

    return {
      transcript,
      confidence,
      engine: 'browser-passthrough',
      message:
        'PLACEHOLDER: STT thật chạy ở trình duyệt (Web Speech API). Endpoint này hiện chỉ echo lại transcript được gửi lên, chuẩn bị sẵn cho tích hợp STT server ở Prompt 19+.',
    };
  }

  async textToSpeech(userId: string, dto: TextToSpeechDto) {
    await this.voiceLogRepo.save(
      this.voiceLogRepo.create({
        userId,
        transcript: dto.text,
      }),
    );

    return {
      text: dto.text,
      audioUrl: null,
      engine: 'browser',
      message:
        'PLACEHOLDER: TTS thật chạy ở trình duyệt qua SpeechSynthesis API, không cần audio từ server. Endpoint này chuẩn bị sẵn cho tích hợp TTS server (trả audioUrl thật) ở Prompt 19+.',
    };
  }
}
