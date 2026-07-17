/**
 * Chuẩn hóa cấu trúc response của toàn bộ API (Standard Response).
 *
 * Thành công:  { success: true,  data: ...,  meta: {...} }
 * Thất bại:    { success: false, error: {...}, meta: {...} }
 *
 * Mọi endpoint đều trả về đúng cấu trúc này — client chỉ cần một cách parse duy nhất.
 */

/** Thông tin kèm theo mọi response, phục vụ trace/debug */
export interface ResponseMeta {
  /** Mã định danh request (correlation id) — trùng với header x-request-id */
  requestId: string | null;
  /** Thời điểm server trả response (ISO 8601) */
  timestamp: string;
  /** Đường dẫn request gốc */
  path?: string;
}

/** Phần thân lỗi chuẩn hóa */
export interface ApiErrorBody {
  /** Mã lỗi thuộc ErrorCode */
  code: string;
  /** Thông điệp lỗi thân thiện, an toàn để hiển thị */
  message: string;
  /** Chi tiết bổ sung (ví dụ danh sách field validation lỗi) */
  details?: unknown;
}

/** Cấu trúc response chuẩn của toàn hệ thống */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T | null;
  error?: ApiErrorBody;
  meta: ResponseMeta;
}
