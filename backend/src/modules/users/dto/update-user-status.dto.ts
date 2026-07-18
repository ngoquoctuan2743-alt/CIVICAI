import { IsEnum } from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { UserStatus } from '../../../database/entities/enums';

/** Dữ liệu khóa/mở tài khoản (ADMIN) */
export class UpdateUserStatusDto extends BaseDto {
  @IsEnum(UserStatus, { message: `status phải là một trong: ${Object.values(UserStatus).join(', ')}` })
  status: UserStatus;
}
