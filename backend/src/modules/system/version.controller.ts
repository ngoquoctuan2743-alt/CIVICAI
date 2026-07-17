import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseController } from '../../common/base/base.controller';
import { Public } from '../../common/decorators/public.decorator';
import { AppLoggerService } from '../../logger/logger.service';

/** Cấu trúc dữ liệu phiên bản */
interface VersionInfo {
  name: string;
  version: string;
  environment: string;
}

/**
 * Version Endpoint — GET /api/v1/version
 * Cho biết tên service, phiên bản đang chạy và môi trường.
 * Phục vụ kiểm tra sau khi deploy (đúng version chưa?).
 */
@Controller('version')
export class VersionController extends BaseController {
  constructor(
    logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    super(logger);
  }

  /** Thông tin phiên bản hiện tại */
  @Public()
  @Get()
  getVersion(): VersionInfo {
    return {
      name: this.configService.get<string>('app.name', 'CIVICAI Backend'),
      version: this.configService.get<string>('app.version', '0.0.0'),
      environment: this.configService.get<string>('app.env', 'development'),
    };
  }
}
