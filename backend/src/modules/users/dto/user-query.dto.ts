import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UserStatus } from '../../../database/entities/enums';
import { Role } from '../../../common/enums/role.enum';

/** Tham số tra cứu tài khoản (ADMIN) */
export class UserQueryDto extends PaginationQueryDto {
  /** Tìm theo email hoặc họ tên */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus, { message: `status phải là một trong: ${Object.values(UserStatus).join(', ')}` })
  status?: UserStatus;

  @IsOptional()
  @IsEnum(Role, { message: `role phải là một trong: ${Object.values(Role).join(', ')}` })
  role?: Role;
}
