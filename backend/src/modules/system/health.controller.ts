import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseController } from '../../common/base/base.controller';
import { Public } from '../../common/decorators/public.decorator';
import { nowIso } from '../../common/utils/common.util';
import { AppLoggerService } from '../../logger/logger.service';

/** Cấu trúc dữ liệu health check */
interface HealthStatus {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Health Check Endpoint — GET /api/v1/health
 * Dùng cho monitoring / load balancer / container orchestrator.
 *
 * TODO(infrastructure): khi có Database và AI Service, bổ sung kiểm tra
 * kết nối tới các dependency (readiness check).
 */
@Controller('health')
export class HealthController extends BaseController {
  constructor(
    logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    super(logger);
  }

  /** Trạng thái sống của service (liveness) */
  @Public()
  @Get()
  getHealth(): HealthStatus {
    this.logger.debug('Health check được gọi');

    return {
      status: 'ok',
      environment: this.configService.get<string>('app.env', 'development'),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: nowIso(),
    };
  }
}
