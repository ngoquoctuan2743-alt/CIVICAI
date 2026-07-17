import { HttpStatus } from '@nestjs/common';

/**
 * Bộ mã lỗi chuẩn hóa của toàn hệ thống.
 * Mọi lỗi trả về client đều PHẢI mang một mã trong danh sách này.
 * Khi thêm nghiệp vụ mới, bổ sung mã lỗi tại đây (không hard-code chuỗi lỗi rải rác).
 */
export enum ErrorCode {
  // ---- Lỗi chung ----
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // ---- Lỗi xác thực / phân quyền ----
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // ---- Lỗi tích hợp (PHASE 4) ----
  /** Quá giới hạn số request cho phép (rate limit) */
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

/**
 * Ánh xạ ErrorCode -> HTTP Status.
 * Đây là nguồn chân lý duy nhất (single source of truth) cho việc chọn status code.
 */
export const ERROR_CODE_HTTP_STATUS: Record<ErrorCode, HttpStatus> = {
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.BAD_REQUEST]: HttpStatus.BAD_REQUEST,
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCode.NOT_IMPLEMENTED]: HttpStatus.NOT_IMPLEMENTED,
  [ErrorCode.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.TOO_MANY_REQUESTS]: HttpStatus.TOO_MANY_REQUESTS,
};

/** Thông điệp mặc định cho từng mã lỗi (dùng khi nơi ném lỗi không truyền message) */
export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INTERNAL_ERROR]: 'Lỗi hệ thống, vui lòng thử lại sau.',
  [ErrorCode.BAD_REQUEST]: 'Yêu cầu không hợp lệ.',
  [ErrorCode.VALIDATION_ERROR]: 'Dữ liệu đầu vào không hợp lệ.',
  [ErrorCode.NOT_FOUND]: 'Không tìm thấy tài nguyên.',
  [ErrorCode.CONFLICT]: 'Dữ liệu bị xung đột.',
  [ErrorCode.NOT_IMPLEMENTED]: 'Chức năng chưa được triển khai.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Dịch vụ tạm thời không khả dụng.',
  [ErrorCode.UNAUTHORIZED]: 'Chưa xác thực hoặc phiên đăng nhập không hợp lệ.',
  [ErrorCode.FORBIDDEN]: 'Không có quyền truy cập tài nguyên này.',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau.',
};

/**
 * Ánh xạ ngược HTTP Status -> ErrorCode.
 * Dùng khi bắt HttpException gốc của NestJS để chuẩn hóa về ErrorCode.
 */
export function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT;
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.NOT_IMPLEMENTED:
      return ErrorCode.NOT_IMPLEMENTED;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}
