import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Dữ liệu ngữ cảnh gắn với vòng đời MỘT request.
 * Được khởi tạo bởi RequestContextMiddleware và đọc ở bất kỳ đâu
 * (logger, interceptor, exception filter) mà không cần truyền tham số.
 */
export interface RequestContextData {
  /** Mã định danh request (correlation id) */
  requestId: string;
  /** Thời điểm request bắt đầu (epoch ms) — dùng tính thời gian xử lý */
  startTime: number;
  /**
   * Mã người dùng đã xác thực.
   * TODO(auth): AuthGuard sẽ gán giá trị này sau khi triển khai Authentication.
   */
  userId?: string;
}

/**
 * Request Context dựa trên AsyncLocalStorage — an toàn với concurrency,
 * mỗi request có một store riêng, không rò rỉ dữ liệu giữa các request.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  /** Chạy callback bên trong một context mới (gọi từ middleware) */
  static run(data: RequestContextData, callback: () => void): void {
    RequestContext.storage.run(data, callback);
  }

  /** Lấy toàn bộ context hiện tại (undefined nếu ngoài vòng đời request) */
  static get(): RequestContextData | undefined {
    return RequestContext.storage.getStore();
  }

  /** Lấy requestId hiện tại — null nếu ngoài vòng đời request (vd: lúc bootstrap) */
  static getRequestId(): string | null {
    return RequestContext.storage.getStore()?.requestId ?? null;
  }
}
