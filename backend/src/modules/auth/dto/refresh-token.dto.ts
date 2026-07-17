import { IsNotEmpty, IsString } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';

/** Yêu cầu cấp lại cặp token từ refresh token */
export class RefreshTokenDto extends BaseDto {
  @IsString()
  @IsNotEmpty({ message: 'refreshToken không được để trống' })
  refreshToken: string;
}
