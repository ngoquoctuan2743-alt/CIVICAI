import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrativeProcedureEntity } from '../../database/entities/administrative-procedure.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { ConversationEntity } from '../../database/entities/conversation.entity';
import { FeedbackEntity } from '../../database/entities/feedback.entity';
import { GovernmentAgencyEntity } from '../../database/entities/government-agency.entity';
import { LegalDocumentEntity } from '../../database/entities/legal-document.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/** Module Dashboard Admin — số liệu tổng quan (chỉ đọc, cross-cutting) */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ConversationEntity,
      AdministrativeProcedureEntity,
      GovernmentAgencyEntity,
      LegalDocumentEntity,
      FeedbackEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
