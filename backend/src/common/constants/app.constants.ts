/**
 * Các hằng số cấp ứng dụng dùng chung cho toàn backend.
 * Không đặt hằng số nghiệp vụ ở đây — file này chỉ dành cho hạ tầng.
 */

/** Header chứa mã định danh request (correlation id) */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Metadata key đánh dấu route công khai (bỏ qua AuthGuard) */
export const IS_PUBLIC_KEY = 'isPublic';

/** Metadata key khai báo danh sách role được phép truy cập route */
export const ROLES_KEY = 'roles';

/** Metadata key ghi đè giới hạn rate-limit cho một route (PHASE 4) */
export const RATE_LIMIT_KEY = 'rateLimit';

/** Giới hạn rate-limit mặc định toàn hệ thống: 100 request / phút / (IP + route) */
export const DEFAULT_RATE_LIMIT = { points: 100, durationMs: 60_000 };

/** TTL cache cho dữ liệu công khai (Government/Legal/Procedures) — PHASE 4 */
export const PUBLIC_DATA_CACHE_TTL_MS = 5 * 60 * 1000;

/** Giá trị mặc định khi biến môi trường không được cung cấp */
export const DEFAULT_PORT = 3000;
export const DEFAULT_API_PREFIX = 'api/v1';
export const DEFAULT_LOG_LEVEL = 'log';
export const DEFAULT_APP_VERSION = '0.1.0';

/** Phân trang mặc định (dùng bởi PaginationQueryDto) */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
