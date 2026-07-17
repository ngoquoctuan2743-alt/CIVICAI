import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLoggerService } from './logger/logger.service';

/**
 * Entry point của CIVICAI Backend.
 * Chỉ làm nhiệm vụ bootstrap — mọi cấu hình chi tiết nằm trong AppModule.
 */
async function bootstrap(): Promise<void> {
  // bufferLogs: giữ log phát sinh trước khi logger tùy chỉnh sẵn sàng
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Dùng AppLoggerService làm logger chung của framework
  const logger = await app.resolve(AppLoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);

  // Mọi route đều nằm dưới prefix chung, vd: /api/v1/health
  app.setGlobalPrefix(apiPrefix);

  // Cho phép Frontend (origin khác cổng) gọi API kèm Authorization header (PHASE 4/5)
  app.enableCors({ origin: corsOrigins, credentials: true });

  // API Documentation (Swagger/OpenAPI) tại /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VAIC 2026 API')
    .setDescription('Virtual AI Citizen Assistant — Backend REST API')
    .setVersion(configService.get<string>('app.version', '0.1.0'))
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  // Cho phép NestJS xử lý tín hiệu shutdown (SIGTERM/SIGINT) một cách an toàn
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`CIVICAI Backend đang chạy tại http://localhost:${port}/${apiPrefix}`);
}

// Bắt lỗi bootstrap để process thoát với mã lỗi rõ ràng (fail-fast)
bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[Bootstrap] Khởi động thất bại:', error);
  process.exit(1);
});
