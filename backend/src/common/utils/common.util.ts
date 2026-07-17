/**
 * Tiện ích dùng chung — CHỈ chứa hàm thuần (pure function), không side-effect.
 * Hàm nghiệp vụ KHÔNG đặt ở đây.
 */

/** Thời điểm hiện tại theo chuẩn ISO 8601 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Kiểm tra giá trị null/undefined (type guard) */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Tính số mili-giây đã trôi qua kể từ mốc startTime (epoch ms).
 * Dùng đo thời gian xử lý request/tác vụ.
 */
export function durationMs(startTime: number): number {
  return Date.now() - startTime;
}
