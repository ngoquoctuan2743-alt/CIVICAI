import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContext } from '../context/request-context';
import {
  DEFAULT_ERROR_MESSAGES,
  ErrorCode,
  httpStatusToErrorCode,
} from '../constants/error-code.constants';
import { ApiResponse } from '../interfaces/api-response.interface';
import { AppLoggerService } from '../../logger/logger.service';
import { AppException } from './app.exception';

/**
 * Global Exception Handler — điểm xử lý lỗi DUY NHẤT của toàn backend.
 *
 * Bắt mọi exception và chuẩn hóa về ApiResponse:
 * 1. AppException      -> dùng errorCode + httpStatus của chính nó
 * 2. HttpException     -> ánh xạ status về ErrorCode tương ứng
 * 3. Lỗi không xác định -> 500 INTERNAL_ERROR, KHÔNG lộ chi tiết nội bộ ra client
 *
 * Logging: lỗi 5xx ghi mức error (kèm stack), lỗi 4xx ghi mức warn.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let code: ErrorCode;
    let message: string;
    let details: unknown;

    if (exception instanceof AppException) {
      // Lỗi chuẩn hóa do code chủ động ném
      status = exception.httpStatus;
      code = exception.errorCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      // Lỗi từ framework NestJS (vd: 404 route không tồn tại)
      status = exception.getStatus();
      code = httpStatusToErrorCode(status);
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const bodyObj = body as { message?: string | string[]; error?: string };
        // ValidationPipe mặc định trả message dạng mảng -> đưa vào details
        if (Array.isArray(bodyObj.message)) {
          message = DEFAULT_ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR];
          code = ErrorCode.VALIDATION_ERROR;
          details = bodyObj.message;
        } else {
          message = bodyObj.message ?? bodyObj.error ?? DEFAULT_ERROR_MESSAGES[code];
        }
      }
    } else {
      // Lỗi không xác định — không để lộ thông tin nội bộ ra client
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCode.INTERNAL_ERROR;
      message = DEFAULT_ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
    }

    this.logException(status, code, exception, request);

    const body: ApiResponse<never> = {
      success: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      meta: {
        requestId: RequestContext.getRequestId(),
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
      },
    };

    response.status(status).json(body);
  }

  /** Ghi log lỗi theo mức độ nghiêm trọng */
  private logException(status: number, code: ErrorCode, exception: unknown, request: Request): void {
    const summary = `${request.method} ${request.originalUrl} -> ${status} [${code}]`;

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(summary, stack);
    } else {
      this.logger.warn(`${summary} ${exception instanceof Error ? exception.message : ''}`);
    }
  }
}
