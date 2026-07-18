import { AdministrativeProcedureEntity } from './administrative-procedure.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { AiTrainingDataEntity } from './ai-training-data.entity';
import { AuditLogEntity } from './audit-log.entity';
import { ChunkProcessingJobEntity } from './chunk-processing-job.entity';
import { CitizenProfileEntity } from './citizen-profile.entity';
import { ConversationEntity } from './conversation.entity';
import { DocumentChunkEntity } from './document-chunk.entity';
import { DocumentEntity } from './document.entity';
import { FeedbackEntity } from './feedback.entity';
import { GovernmentAgencyEntity } from './government-agency.entity';
import { KbChunkEntity } from './kb-chunk.entity';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';
import { KnowledgeDocumentTagEntity } from './knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from './knowledge-document-version.entity';
import { LegalDocumentEntity } from './legal-document.entity';
import { MessageEntity } from './message.entity';
import { ParsingLogEntity } from './parsing-log.entity';
import { PermissionEntity } from './permission.entity';
import { ProcedureRequirementEntity } from './procedure-requirement.entity';
import { ProcedureStepEntity } from './procedure-step.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { RoleEntity } from './role.entity';
import { UserEntity } from './user.entity';
import { VoiceLogEntity } from './voice-log.entity';

/**
 * Danh sách TOÀN BỘ entity của hệ thống — nguồn chân lý duy nhất
 * cho cả runtime (AppModule) lẫn CLI migration (data-source.ts).
 * Thêm entity mới -> bắt buộc bổ sung vào đây.
 */
export const ALL_ENTITIES = [
  AdministrativeProcedureEntity,
  AdministrativeUnitEntity,
  AiTrainingDataEntity,
  AuditLogEntity,
  ChunkProcessingJobEntity,
  CitizenProfileEntity,
  ConversationEntity,
  DocumentChunkEntity,
  DocumentEntity,
  FeedbackEntity,
  GovernmentAgencyEntity,
  KbChunkEntity,
  KnowledgeDocumentEntity,
  KnowledgeDocumentTagEntity,
  KnowledgeDocumentVersionEntity,
  LegalDocumentEntity,
  MessageEntity,
  ParsingLogEntity,
  PermissionEntity,
  ProcedureRequirementEntity,
  ProcedureStepEntity,
  RefreshTokenEntity,
  RoleEntity,
  UserEntity,
  VoiceLogEntity,
];
