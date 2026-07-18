import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { AuditLogService } from './audit-log.service';

/** Ghi audit log dùng chung toàn app — @Global để mọi module dùng ngay không cần import lại */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
