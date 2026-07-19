import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { BaseController } from '../../common/base/base.controller';
import { Public } from '../../common/decorators/public.decorator';
import { nowIso } from '../../common/utils/common.util';
import { AppLoggerService } from '../../logger/logger.service';
import { AiClientService } from '../ai-client/ai-client.service';

/** Trạng thái từng dependency trong readiness check */
interface DependencyChecks {
  database: 'ok' | 'error';
  aiService: 'ok' | 'error';
}

/** Cấu trúc dữ liệu health check (mở rộng PHASE 7 — không đổi field cũ) */
interface HealthStatus {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  ready: boolean;
  checks: DependencyChecks;
  /** Thật từ AI Service /health, null khi service không reachable — dùng cho Demo Mode dashboard, không hardcode */
  aiProvider: string | null;
  embeddingModel: string | null;
}

/**
 * Health Check Endpoint — GET /api/v1/health
 * Dùng cho monitoring / load balancer / container orchestrator.
 *
 * `status` vẫn giữ nguyên ý nghĩa liveness cũ (process còn sống thì luôn "ok" —
 * không phá vỡ client cũ đang check `data.status === 'ok'`).
 * PHASE 7 bổ sung thêm `ready` + `checks`: readiness thật của Database và AI Service,
 * KHÔNG đổi field/behaviour cũ.
 */
@Controller('health')
export class HealthController extends BaseController {
  constructor(
    logger: AppLoggerService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly aiClient: AiClientService,
  ) {
    super(logger);
  }

  /** Trạng thái sống của service (liveness) + readiness của dependency */
  @Public()
  @Get()
  async getHealth(): Promise<HealthStatus> {
    this.logger.debug('Health check được gọi');

    const [databaseOk, aiHealth] = await Promise.all([this.checkDatabase(), this.aiClient.checkHealth()]);

    const checks: DependencyChecks = {
      database: databaseOk ? 'ok' : 'error',
      aiService: aiHealth.ok ? 'ok' : 'error',
    };

    return {
      status: 'ok',
      environment: this.configService.get<string>('app.env', 'development'),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: nowIso(),
      ready: databaseOk && aiHealth.ok,
      checks,
      aiProvider: aiHealth.llmProvider,
      embeddingModel: aiHealth.embeddingModel,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
