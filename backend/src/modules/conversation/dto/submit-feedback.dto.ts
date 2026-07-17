import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Đánh giá một câu trả lời của AI: 👍 = 1, 👎 = -1 */
export class SubmitFeedbackDto extends BaseDto {
  @IsIn([1, -1], { message: 'rating phải là 1 (👍 hữu ích) hoặc -1 (👎 chưa chính xác)' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
