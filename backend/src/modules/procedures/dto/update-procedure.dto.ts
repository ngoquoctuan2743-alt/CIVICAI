import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { BaseDto } from '../../../common/dto/base.dto';
import { OnlineLevel, ProcedureStatus } from '../../../database/entities/enums';

/** Dữ liệu cập nhật thủ tục hành chính (ADMIN) — chỉ ghi đè field được gửi lên */
export class UpdateProcedureDto extends BaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'code không được để trống' })
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'name không được để trống' })
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'agencyId phải là UUID' })
  agencyId?: string;

  @IsOptional()
  @IsEnum(OnlineLevel, {
    message: `onlineLevel phải là một trong: ${Object.values(OnlineLevel).join(', ')}`,
  })
  onlineLevel?: OnlineLevel;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  processingTimeText?: string;

  @IsOptional()
  @IsString()
  legalBasisText?: string;

  @IsOptional()
  @IsEnum(ProcedureStatus, {
    message: `status phải là một trong: ${Object.values(ProcedureStatus).join(', ')}`,
  })
  status?: ProcedureStatus;
}
