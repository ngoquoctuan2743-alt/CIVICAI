import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { VersionController } from './version.controller';

/**
 * System Module — nhóm các endpoint hạ tầng (health, version).
 * KHÔNG chứa endpoint nghiệp vụ.
 */
@Module({
  controllers: [HealthController, VersionController],
})
export class SystemModule {}
