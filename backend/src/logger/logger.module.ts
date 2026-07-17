import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './logger.service';

/**
 * Module cung cấp AppLoggerService cho toàn ứng dụng.
 * @Global: mọi module khác inject được logger mà không cần import lại.
 */
@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
