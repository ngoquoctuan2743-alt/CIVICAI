import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Đổi tên hội thoại */
export class RenameConversationDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'title không được để trống' })
  @MaxLength(255)
  title: string;
}
