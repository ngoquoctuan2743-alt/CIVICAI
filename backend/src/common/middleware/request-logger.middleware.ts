import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppLoggerService } from '../../logger/logger.service';

/**
 * Middleware ghi log vòng đời request:
 * - Khi nhận request:  "--> METHOD /path"
 * - Khi trả response:  "<-- METHOD /path STATUS (Xms)"
 *
 * KHÔNG log body/header để tránh lộ dữ liệu nhạy cảm.
 * TODO(logging): cân nhắc log thêm user-agent/IP khi có yêu cầu audit.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HTTP');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    this.logger.log(`--> ${req.method} ${req.originalUrl}`);

    // 'finish' phát khi response đã gửi xong tới client
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const line = `<-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`;

      if (res.statusCode >= 500) {
        this.logger.error(line);
      } else if (res.statusCode >= 400) {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }
    });

    next();
  }
}
