import { ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';

/**
 * Validation Layer — cấu hình ValidationPipe toàn cục.
 *
 * - whitelist: tự loại bỏ field không khai báo trong DTO (chống mass-assignment)
 * - forbidNonWhitelisted: request chứa field lạ -> báo lỗi thay vì im lặng bỏ qua
 * - transform: tự chuyển payload thô thành instance DTO (kích hoạt default value)
 * - exceptionFactory: chuẩn hóa lỗi validation về AppException (VALIDATION_ERROR)
 *   để GlobalExceptionFilter trả response đúng định dạng chung.
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      AppException.validation(undefined, formatValidationErrors(errors)),
  });
}

/** Cấu trúc chi tiết một field lỗi trả về client */
interface FieldError {
  field: string;
  errors: string[];
}

/**
 * Chuyển ValidationError (dạng cây, có thể lồng nhau) thành danh sách phẳng
 * { field, errors } dễ đọc cho client.
 */
function formatValidationErrors(errors: ValidationError[], parentPath = ''): FieldError[] {
  const result: FieldError[] = [];

  for (const error of errors) {
    const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      result.push({ field: fieldPath, errors: Object.values(error.constraints) });
    }

    // Đệ quy cho DTO lồng nhau (nested object)
    if (error.children && error.children.length > 0) {
      result.push(...formatValidationErrors(error.children, fieldPath));
    }
  }

  return result;
}
