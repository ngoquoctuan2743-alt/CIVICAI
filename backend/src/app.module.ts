import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as pg from 'pg';
import configuration, { AuthConfig, DatabaseConfig } from './config/configuration';
import { ALL_ENTITIES } from './database/entities';
import { validateEnv } from './config/env.validation';
import { AuditLogModule } from './common/audit/audit-log.module';
import { MemoryCacheModule } from './common/cache/memory-cache.module';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { buildValidationPipe } from './common/validation/validation.factory';
import { LoggerModule } from './logger/logger.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiClientModule } from './modules/ai-client/ai-client.module';
import { AuthModule } from './modules/auth/auth.module';
import { CitizenModule } from './modules/citizen/citizen.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { GovernmentModule } from './modules/government/government.module';
import { LegalModule } from './modules/legal/legal.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { SystemModule } from './modules/system/system.module';
import { UsersModule } from './modules/users/users.module';
import { VoiceModule } from './modules/voice/voice.module';

/**
 * Root Module — lắp ráp toàn bộ backend (DI Container của NestJS).
 *
 * Thứ tự xử lý một request:
 *   RequestContextMiddleware -> RequestLoggerMiddleware
 *   -> AuthGuard (JWT) -> RolesGuard
 *   -> ValidationPipe -> Controller
 *   -> ResponseInterceptor (thành công) / GlobalExceptionFilter (lỗi)
 */
@Module({
  imports: [
    // Configuration Management — nạp + validate env, dùng chung toàn app
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    // Database connection — cấu hình lấy từ ConfigService (không đọc env trực tiếp)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<DatabaseConfig>('database');
        return {
          type: 'postgres' as const,
          // Truyền driver tường minh — tránh lỗi resolve module 'pg' dưới Jest
          driver: pg,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          logging: db.logging,
          // Đăng ký đầy đủ entity (autoLoadEntities chỉ nạp entity của forFeature
          // — không đủ khi entity có quan hệ tới entity chưa module nào dùng)
          entities: ALL_ENTITIES,
          autoLoadEntities: true,
          // Schema chỉ thay đổi qua migration — không bao giờ synchronize
          synchronize: false,
        };
      },
    }),
    // JWT dùng chung toàn app (AuthGuard + AuthService)
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const auth = config.getOrThrow<AuthConfig>('auth');
        return {
          secret: auth.jwtSecret,
          // Cấu hình là string dạng '15m' — ép về kiểu StringValue của thư viện ms
          signOptions: { expiresIn: auth.accessExpiresIn as JwtSignOptions['expiresIn'] },
        };
      },
    }),
    LoggerModule,
    MemoryCacheModule,
    AuditLogModule,
    SystemModule,
    // ---- Module nghiệp vụ (PHASE 2) ----
    AuthModule,
    UsersModule,
    CitizenModule,
    GovernmentModule,
    LegalModule,
    ProceduresModule,
    // ---- Module tích hợp AI (PHASE 4) ----
    AiClientModule,
    ConversationModule,
    DocumentsModule,
    VoiceModule,
    // ---- Dashboard Admin ----
    AdminModule,
  ],
  providers: [
    // Validation toàn cục cho mọi DTO
    { provide: APP_PIPE, useFactory: buildValidationPipe },
    // Chuẩn hóa response thành công
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Chuẩn hóa response lỗi
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Rate limit — chạy TRƯỚC xác thực để chặn brute-force sớm nhất có thể
    { provide: APP_GUARD, useClass: RateLimitGuard },
    // Xác thực (secure by default) — chạy trước RolesGuard
    { provide: APP_GUARD, useClass: AuthGuard },
    // Phân quyền theo role
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  /** Đăng ký middleware cho MỌI route — context phải chạy trước logger */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, RequestLoggerMiddleware).forRoutes('{*splat}');
  }
}
