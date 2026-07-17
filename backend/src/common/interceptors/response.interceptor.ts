import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestContext } from '../context/request-context';
import { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Response Wrapper — bọc MỌI response thành công vào cấu trúc chuẩn:
 * { success: true, data: <kết quả controller>, meta: { requestId, timestamp, path } }
 *
 * Controller chỉ cần return dữ liệu thô; việc chuẩn hóa do interceptor này đảm nhiệm.
 * (Response lỗi được chuẩn hóa bởi GlobalExceptionFilter.)
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
        meta: {
          requestId: RequestContext.getRequestId(),
          timestamp: new Date().toISOString(),
          path: request.originalUrl,
        },
      })),
    );
  }
}
