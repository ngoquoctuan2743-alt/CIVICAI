import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { MessageContentType } from '../../../database/entities/enums';

/** Gửi một tin nhắn của người dân vào hội thoại */
export class CreateMessageDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @MaxLength(10000, { message: 'Tin nhắn tối đa 10.000 ký tự' })
  content: string;

  @IsOptional()
  @IsEnum(MessageContentType, {
    message: `contentType phải là một trong: ${Object.values(MessageContentType).join(', ')}`,
  })
  contentType?: MessageContentType;
}
