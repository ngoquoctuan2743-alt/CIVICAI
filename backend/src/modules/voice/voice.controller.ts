import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { SpeechToTextDto } from './dto/speech-to-text.dto';
import { TextToSpeechDto } from './dto/text-to-speech.dto';
import { VoiceService } from './voice.service';

/** API Voice — PLACEHOLDER, xem ghi chú trong VoiceService */
@ApiTags('voice')
@ApiBearerAuth()
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('stt')
  @ApiOperation({ summary: '[PLACEHOLDER] Speech-to-Text — STT thật chạy ở trình duyệt' })
  speechToText(@CurrentUser() user: AuthUser, @Body() dto: SpeechToTextDto) {
    return this.voiceService.speechToText(user.userId, dto);
  }

  @Post('tts')
  @ApiOperation({ summary: '[PLACEHOLDER] Text-to-Speech — TTS thật chạy ở trình duyệt' })
  textToSpeech(@CurrentUser() user: AuthUser, @Body() dto: TextToSpeechDto) {
    return this.voiceService.textToSpeech(user.userId, dto);
  }
}
