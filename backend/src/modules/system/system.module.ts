import { Module } from '@nestjs/common';
import { AiClientModule } from '../ai-client/ai-client.module';
import { HealthController } from './health.controller';
import { VersionController } from './version.controller';

/**
 * System Module — nhóm các endpoint hạ tầng (health, version).
 * KHÔNG chứa endpoint nghiệp vụ.
 */
@Module({
  imports: [AiClientModule],
  controllers: [HealthController, VersionController],
})
export class SystemModule {}
