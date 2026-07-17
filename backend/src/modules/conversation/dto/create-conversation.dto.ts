import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { ConversationChannel } from '../../../database/entities/enums';

/** Tạo phiên hội thoại mới */
export class CreateConversationDto extends BaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsEnum(ConversationChannel, {
    message: `channel phải là một trong: ${Object.values(ConversationChannel).join(', ')}`,
  })
  channel?: ConversationChannel;
}
