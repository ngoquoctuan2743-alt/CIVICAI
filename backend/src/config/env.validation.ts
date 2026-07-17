import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';
import { Environment } from '../common/enums/environment.enum';

/**
 * Environment Loader — validate biến môi trường NGAY KHI KHỞI ĐỘNG.
 * Nếu cấu hình sai (vd PORT không phải số), ứng dụng fail-fast với thông báo rõ ràng
 * thay vì chạy với cấu hình lỗi rồi chết ngầm lúc runtime.
 */

/** Danh sách log level hợp lệ */
const LOG_LEVELS = ['error', 'warn', 'log', 'debug', 'verbose'] as const;

/**
 * Khai báo schema các biến môi trường được backend sử dụng.
 * Tất cả đều optional vì đã có giá trị mặc định trong configuration.ts —
 * nhưng NẾU được cung cấp thì PHẢI hợp lệ.
 */
class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment, {
    message: `NODE_ENV phải là một trong: ${Object.values(Environment).join(', ')}`,
  })
  NODE_ENV?: Environment;

  @IsOptional()
  @IsInt({ message: 'PORT phải là số nguyên' })
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsOptional()
  @IsString()
  APP_VERSION?: string;

  @IsOptional()
  @IsEnum(LOG_LEVELS.reduce((acc, l) => ({ ...acc, [l]: l }), {}), {
    message: `LOG_LEVEL phải là một trong: ${LOG_LEVELS.join(', ')}`,
  })
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsInt({ message: 'JWT_REFRESH_EXPIRES_DAYS phải là số nguyên' })
  @Min(1)
  JWT_REFRESH_EXPIRES_DAYS?: number;

  @IsOptional()
  @IsString()
  DB_HOST?: string;

  @IsOptional()
  @IsInt({ message: 'DB_PORT phải là số nguyên' })
  @Min(1)
  @Max(65535)
  DB_PORT?: number;
}

/**
 * Hàm validate được ConfigModule gọi khi nạp env.
 * Ném Error (làm dừng bootstrap) nếu có biến không hợp lệ.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  // enableImplicitConversion: tự chuyển "3000" (string) -> 3000 (number) trước khi validate
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  // Production bắt buộc phải có JWT_SECRET riêng (không dùng mặc định dev)
  if (config.NODE_ENV === Environment.Production && !config.JWT_SECRET) {
    throw new Error('[ENV] JWT_SECRET là bắt buộc ở môi trường production');
  }

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join('; '))
      .join(' | ');
    throw new Error(`[ENV] Cấu hình môi trường không hợp lệ: ${messages}`);
  }

  return validated;
}
