import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/**
 * Yêu cầu chuyển văn bản -> giọng nói.
 * PLACEHOLDER: TTS thật hiện chạy tại trình duyệt qua Web Speech API
 * (SpeechSynthesis) — Frontend tự đọc câu trả lời AI, không gọi endpoint này.
 * Dành cho tích hợp TTS phía server ở giai đoạn sau, hiện trả kết quả mock.
 */
export class TextToSpeechDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'text không được để trống' })
  @MaxLength(5000)
  text: string;
}
