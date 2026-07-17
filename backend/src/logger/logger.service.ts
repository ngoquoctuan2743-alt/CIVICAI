import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestContext } from '../common/context/request-context';

/**
 * Logger chuẩn của toàn backend.
 *
 * Định dạng: [timestamp] [LEVEL] [context] [req:<requestId>] message
 * - Tự động gắn requestId từ RequestContext để trace log theo từng request.
 * - Mức log điều khiển bởi biến môi trường LOG_LEVEL.
 * - Scope.TRANSIENT: mỗi nơi inject nhận một instance riêng, giữ context riêng.
 *
 * TODO(logging): khi cần, thay console bằng transport khác (file, ELK, Loki...)
 * — chỉ cần sửa duy nhất hàm write() bên dưới.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  /** Thứ tự ưu tiên mức log — số nhỏ = nghiêm trọng hơn */
  private static readonly LEVEL_PRIORITY: Record<string, number> = {
    error: 0,
    warn: 1,
    log: 2,
    debug: 3,
    verbose: 4,
  };

  /** Tên ngữ cảnh (thường là tên class) hiển thị trong log */
  private context = 'App';

  /** Mức log được cấu hình */
  private readonly configuredLevel: string;

  constructor(configService: ConfigService) {
    this.configuredLevel = configService.get<string>('logging.level', 'log');
  }

  /** Gán ngữ cảnh cho instance logger này (gọi trong constructor nơi sử dụng) */
  setContext(context: string): void {
    this.context = context;
  }

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  /**
   * Ghi log lỗi. Tham số thứ hai theo convention của NestJS có thể là
   * stack trace (chuỗi nhiều dòng) hoặc context (tên class).
   */
  error(message: unknown, stackOrContext?: string, context?: string): void {
    const isStack = !!stackOrContext && stackOrContext.includes('\n');
    this.write('error', message, context ?? (isStack ? undefined : stackOrContext));

    // In stack trace (nếu có) ở dòng riêng để dễ đọc
    if (isStack) {
      // eslint-disable-next-line no-console
      console.error(stackOrContext);
    }
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  /** Kiểm tra một mức log có được phép ghi hay không */
  private shouldLog(level: string): boolean {
    const configured = AppLoggerService.LEVEL_PRIORITY[this.configuredLevel] ?? 2;
    const current = AppLoggerService.LEVEL_PRIORITY[level] ?? 2;
    return current <= configured;
  }

  /** Điểm ghi log duy nhất — mọi transport thay thế chỉ cần sửa hàm này */
  private write(level: string, message: unknown, contextOverride?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const ctx = contextOverride ?? this.context;
    const requestId = RequestContext.getRequestId();
    const reqPart = requestId ? ` [req:${requestId}]` : '';
    const line = `[${timestamp}] [${level.toUpperCase()}] [${ctx}]${reqPart} ${String(message)}`;

    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](line);
  }
}
