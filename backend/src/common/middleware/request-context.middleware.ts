import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { REQUEST_ID_HEADER } from '../constants/app.constants';
import { RequestContext } from '../context/request-context';

/**
 * Middleware khởi tạo Request Context cho MỖI request.
 *
 * - Lấy requestId từ header x-request-id (nếu client/gateway đã gắn)
 *   hoặc sinh mới bằng UUID.
 * - Gắn requestId vào response header để client đối chiếu khi báo lỗi.
 * - Mọi log/response sau đó tự động mang requestId này.
 *
 * LƯU Ý: phải được đăng ký TRƯỚC mọi middleware khác trong AppModule.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.headers[REQUEST_ID_HEADER];
    const requestId = typeof incomingId === 'string' && incomingId.trim() !== '' ? incomingId : randomUUID();

    // Trả requestId về client để phục vụ tra cứu log
    res.setHeader(REQUEST_ID_HEADER, requestId);

    // Toàn bộ pipeline xử lý request chạy bên trong context này
    RequestContext.run({ requestId, startTime: Date.now() }, next);
  }
}
