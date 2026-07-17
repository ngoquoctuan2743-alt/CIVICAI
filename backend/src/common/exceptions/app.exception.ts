import { HttpStatus } from '@nestjs/common';
import {
  DEFAULT_ERROR_MESSAGES,
  ERROR_CODE_HTTP_STATUS,
  ErrorCode,
} from '../constants/error-code.constants';

/**
 * Exception chuẩn hóa của toàn hệ thống.
 *
 * Quy tắc: mọi lỗi CHỦ ĐỘNG ném ra trong code nghiệp vụ phải là AppException
 * (hoặc subclass của nó) — không ném Error thô, không ném HttpException trực tiếp.
 * GlobalExceptionFilter sẽ dựa vào errorCode để chọn HTTP status và format response.
 */
export class AppException extends Error {
  constructor(
    /** Mã lỗi chuẩn hóa — quyết định HTTP status trả về */
    public readonly errorCode: ErrorCode,
    /** Thông điệp tùy chỉnh; bỏ trống sẽ dùng thông điệp mặc định của mã lỗi */
    message?: string,
    /** Chi tiết bổ sung trả về client (vd: danh sách field lỗi) */
    public readonly details?: unknown,
  ) {
    super(message ?? DEFAULT_ERROR_MESSAGES[errorCode]);
    this.name = 'AppException';
    // Giữ nguyên prototype chain khi target ES2022
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** HTTP status tương ứng với mã lỗi */
  get httpStatus(): HttpStatus {
    return ERROR_CODE_HTTP_STATUS[this.errorCode];
  }

  // ---- Factory methods tiện dụng ----

  static badRequest(message?: string, details?: unknown): AppException {
    return new AppException(ErrorCode.BAD_REQUEST, message, details);
  }

  static validation(message?: string, details?: unknown): AppException {
    return new AppException(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message?: string): AppException {
    return new AppException(ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message?: string): AppException {
    return new AppException(ErrorCode.FORBIDDEN, message);
  }

  static notFound(message?: string): AppException {
    return new AppException(ErrorCode.NOT_FOUND, message);
  }

  static conflict(message?: string, details?: unknown): AppException {
    return new AppException(ErrorCode.CONFLICT, message, details);
  }

  static internal(message?: string): AppException {
    return new AppException(ErrorCode.INTERNAL_ERROR, message);
  }

  static notImplemented(message?: string): AppException {
    return new AppException(ErrorCode.NOT_IMPLEMENTED, message);
  }

  static serviceUnavailable(message?: string): AppException {
    return new AppException(ErrorCode.SERVICE_UNAVAILABLE, message);
  }

  static tooManyRequests(message?: string): AppException {
    return new AppException(ErrorCode.TOO_MANY_REQUESTS, message);
  }
}
