import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { AppLoggerService } from '../../logger/logger.service';

/** Ngữ cảnh request tối thiểu cần để ghi audit log */
export interface AuditRequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * AuditLogService — ghi nhật ký hoạt động hệ thống vào bảng audit_logs
 * (PHASE Database Layer — PROMPT 17). Ghi tại các điểm nghiệp vụ nhạy cảm
 * (đăng nhập, thao tác quản trị) thay vì global interceptor generic, để mỗi
 * bản ghi có action/resourceType rõ nghĩa thay vì suy đoán từ route.
 *
 * Append-only, KHÔNG BAO GIỜ throw — audit log lỗi không được làm hỏng luồng nghiệp vụ chính.
 */
@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity) private readonly auditLogRepo: Repository<AuditLogEntity>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AuditLogService.name);
  }

  async record(
    action: string,
    options: {
      actorUserId?: string | null;
      resourceType?: string | null;
      resourceId?: string | null;
      metadata?: Record<string, unknown> | null;
      request?: AuditRequestContext;
    } = {},
  ): Promise<void> {
    try {
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          actorUserId: options.actorUserId ?? null,
          action,
          resourceType: options.resourceType ?? null,
          resourceId: options.resourceId ?? null,
          ipAddress: options.request?.ipAddress ?? null,
          userAgent: options.request?.userAgent ?? null,
          metadata: options.metadata ?? null,
        }),
      );
    } catch (error) {
      // Không throw — audit log là phụ trợ, không được chặn nghiệp vụ chính
      this.logger.warn(`Ghi audit log that bai (action=${action}): ${(error as Error).message}`);
    }
  }
}
