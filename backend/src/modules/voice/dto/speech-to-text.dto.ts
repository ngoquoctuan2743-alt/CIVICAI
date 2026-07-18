import { IsOptional, IsString, IsUUID } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/**
 * Yêu cầu chuyển giọng nói -> văn bản.
 * PLACEHOLDER: STT thật hiện chạy tại trình duyệt qua Web Speech API (kiến trúc
 * đã chốt Phase 3) — client gửi transcript đã nhận diện kèm luồng chat bình thường
 * (`POST /conversations/:id/messages` với `channel=VOICE`). Endpoint này dành cho
 * tích hợp STT phía server ở giai đoạn sau (Prompt 19+), hiện trả kết quả mock.
 */
export class SpeechToTextDto extends BaseDto {
  /** documentId của file ghi âm đã upload qua /documents (nếu có) */
  @IsOptional()
  @IsUUID(undefined, { message: 'documentId phải là UUID' })
  documentId?: string;

  /** Transcript client đã tự nhận diện (Web Speech API) — dùng để test passthrough */
  @IsOptional()
  @IsString()
  transcript?: string;
}
