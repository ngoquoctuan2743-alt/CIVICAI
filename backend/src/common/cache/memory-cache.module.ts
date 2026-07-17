import { Global, Module } from '@nestjs/common';
import { MemoryCacheService } from './memory-cache.service';

/** Cache in-memory dùng chung toàn app — @Global để mọi module dùng ngay không cần import lại */
@Global()
@Module({
  providers: [MemoryCacheService],
  exports: [MemoryCacheService],
})
export class MemoryCacheModule {}
