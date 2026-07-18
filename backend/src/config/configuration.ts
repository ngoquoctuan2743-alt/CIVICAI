import {
  DEFAULT_API_PREFIX,
  DEFAULT_APP_VERSION,
  DEFAULT_LOG_LEVEL,
  DEFAULT_PORT,
} from '../common/constants/app.constants';
import { Environment } from '../common/enums/environment.enum';

/**
 * Configuration Management — điểm truy cập DUY NHẤT tới biến môi trường.
 * Toàn bộ code còn lại chỉ đọc cấu hình qua ConfigService (vd: 'app.port'),
 * KHÔNG đọc process.env trực tiếp ở bất kỳ nơi nào khác.
 */

/** Cấu hình ứng dụng */
export interface AppConfig {
  name: string;
  env: Environment;
  port: number;
  apiPrefix: string;
  version: string;
  /** Danh sách origin Frontend được phép gọi API (CORS) */
  corsOrigins: string[];
}

/** Cấu hình logging */
export interface LoggingConfig {
  level: string;
}

/** Cấu hình xác thực JWT */
export interface AuthConfig {
  jwtSecret: string;
  /** TTL access token, vd: '15m' */
  accessExpiresIn: string;
  /** TTL refresh token tính theo ngày */
  refreshExpiresDays: number;
}

/** Cấu hình kết nối PostgreSQL */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  logging: boolean;
}

/** Cấu hình gọi AI Service (PHASE 4) */
export interface AiServiceConfig {
  baseUrl: string;
  /** Timeout riêng theo loại tác vụ (ms) — vision/OCR chậm hơn chat/search */
  chatTimeoutMs: number;
  documentTimeoutMs: number;
  searchTimeoutMs: number;
  /** Circuit breaker: số lỗi liên tiếp để mở mạch, và thời gian mạch mở (ms) */
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

/** Cấu hình lưu trữ file local (PHASE 4 — OCR upload; mở rộng Document Ingestion) */
export interface StorageConfig {
  uploadDir: string;
  maxFileSizeBytes: number;
  /** Giới hạn riêng cho tài liệu kho tri thức (PDF/DOCX...) — thường lớn hơn ảnh */
  maxDocumentFileSizeBytes: number;
}

/** Cấu trúc cấu hình gốc của toàn backend */
export interface RootConfig {
  app: AppConfig;
  logging: LoggingConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  aiService: AiServiceConfig;
  storage: StorageConfig;
}

/**
 * Factory nạp cấu hình từ biến môi trường (đã được validate bởi env.validation.ts).
 * Giá trị mặc định chỉ được khai báo tại đây.
 */
export default (): RootConfig => ({
  app: {
    name: 'VAIC Backend',
    env: (process.env.NODE_ENV as Environment) ?? Environment.Development,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT,
    apiPrefix: process.env.API_PREFIX ?? DEFAULT_API_PREFIX,
    version: process.env.APP_VERSION ?? DEFAULT_APP_VERSION,
    // Mặc định cho phép các cổng dev phổ biến của Frontend (Next.js) trên localhost
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  },
  logging: {
    level: process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL,
  },
  auth: {
    // JWT_SECRET bắt buộc ở production (env.validation.ts đảm bảo); dev có mặc định
    jwtSecret: process.env.JWT_SECRET ?? 'vaic-dev-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresDays: process.env.JWT_REFRESH_EXPIRES_DAYS
      ? parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS, 10)
      : 7,
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5433,
    username: process.env.DB_USER ?? 'vaic',
    password: process.env.DB_PASSWORD ?? 'vaic_dev_password',
    database: process.env.DB_NAME ?? 'vaic',
    logging: process.env.DB_LOGGING === 'true',
  },
  aiService: {
    baseUrl: process.env.AI_SERVICE_BASE_URL ?? 'http://localhost:8000',
    chatTimeoutMs: process.env.AI_CHAT_TIMEOUT_MS ? parseInt(process.env.AI_CHAT_TIMEOUT_MS, 10) : 20000,
    documentTimeoutMs: process.env.AI_DOCUMENT_TIMEOUT_MS
      ? parseInt(process.env.AI_DOCUMENT_TIMEOUT_MS, 10)
      : 25000,
    searchTimeoutMs: process.env.AI_SEARCH_TIMEOUT_MS ? parseInt(process.env.AI_SEARCH_TIMEOUT_MS, 10) : 8000,
    circuitBreakerThreshold: process.env.AI_CIRCUIT_BREAKER_THRESHOLD
      ? parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD, 10)
      : 5,
    circuitBreakerResetMs: process.env.AI_CIRCUIT_BREAKER_RESET_MS
      ? parseInt(process.env.AI_CIRCUIT_BREAKER_RESET_MS, 10)
      : 30000,
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR ?? './uploads',
    maxFileSizeBytes: process.env.MAX_FILE_SIZE_BYTES
      ? parseInt(process.env.MAX_FILE_SIZE_BYTES, 10)
      : 8 * 1024 * 1024,
    maxDocumentFileSizeBytes: process.env.MAX_DOCUMENT_FILE_SIZE_BYTES
      ? parseInt(process.env.MAX_DOCUMENT_FILE_SIZE_BYTES, 10)
      : 25 * 1024 * 1024,
  },
});
