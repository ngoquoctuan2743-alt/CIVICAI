import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdministrativeProcedureEntity } from '../../database/entities/administrative-procedure.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { ConversationEntity } from '../../database/entities/conversation.entity';
import { ProcedureStatus, LegalDocStatus, ConversationStatus, UserStatus } from '../../database/entities/enums';
import { FeedbackEntity } from '../../database/entities/feedback.entity';
import { GovernmentAgencyEntity } from '../../database/entities/government-agency.entity';
import { LegalDocumentEntity } from '../../database/entities/legal-document.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';

/**
 * AdminService — tổng hợp số liệu cho Dashboard Admin (chỉ đọc, không sở hữu
 * entity nào; mỗi entity vẫn được CRUD qua admin controller của module tương ứng
 * — procedures/legal/government — để tránh trùng nghiệp vụ).
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(AdministrativeProcedureEntity)
    private readonly procedureRepo: Repository<AdministrativeProcedureEntity>,
    @InjectRepository(GovernmentAgencyEntity)
    private readonly agencyRepo: Repository<GovernmentAgencyEntity>,
    @InjectRepository(LegalDocumentEntity)
    private readonly legalRepo: Repository<LegalDocumentEntity>,
    @InjectRepository(FeedbackEntity)
    private readonly feedbackRepo: Repository<FeedbackEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
  ) {}

  /** Số liệu tổng quan Dashboard Admin */
  async getDashboardSummary() {
    const [
      usersTotal,
      usersActive,
      conversationsTotal,
      conversationsActive,
      proceduresTotal,
      proceduresActive,
      agenciesTotal,
      legalTotal,
      legalEffective,
      feedbackTotal,
      feedbackPositive,
      feedbackNegative,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.conversationRepo.count(),
      this.conversationRepo.count({ where: { status: ConversationStatus.ACTIVE } }),
      this.procedureRepo.count(),
      this.procedureRepo.count({ where: { status: ProcedureStatus.ACTIVE } }),
      this.agencyRepo.count(),
      this.legalRepo.count(),
      this.legalRepo.count({ where: { status: LegalDocStatus.CON_HIEU_LUC } }),
      this.feedbackRepo.count(),
      this.feedbackRepo.count({ where: { rating: 1 } }),
      this.feedbackRepo.count({ where: { rating: -1 } }),
    ]);

    return {
      users: { total: usersTotal, active: usersActive },
      conversations: { total: conversationsTotal, active: conversationsActive },
      procedures: { total: proceduresTotal, active: proceduresActive },
      agencies: { total: agenciesTotal },
      legalDocuments: { total: legalTotal, effective: legalEffective },
      feedback: { total: feedbackTotal, positive: feedbackPositive, negative: feedbackNegative },
    };
  }

  /** Danh sách feedback kèm ngữ cảnh (người đánh giá, nội dung tin nhắn được đánh giá) */
  async getFeedbackList(query: FeedbackQueryDto) {
    const qb = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoin('feedback.user', 'user')
      .leftJoin('feedback.message', 'message')
      .addSelect(['user.id', 'user.email', 'user.fullName', 'message.id', 'message.content'])
      .orderBy('feedback.createdAt', 'DESC');

    if (query.rating !== undefined) {
      qb.andWhere('feedback.rating = :rating', { rating: query.rating });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }

  /** Thống kê feedback: tổng, tích cực/tiêu cực, tỉ lệ hài lòng */
  async getFeedbackStats() {
    const [total, positive, negative] = await Promise.all([
      this.feedbackRepo.count(),
      this.feedbackRepo.count({ where: { rating: 1 } }),
      this.feedbackRepo.count({ where: { rating: -1 } }),
    ]);
    const satisfactionRate = total > 0 ? Math.round((positive / total) * 1000) / 10 : null;

    return { total, positive, negative, satisfactionRate };
  }

  /** Danh sách audit log — mới nhất trước, lọc theo action/resourceType/actorUserId */
  async getAuditLogs(query: AuditLogQueryDto) {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoin('log.actor', 'actor')
      .addSelect(['actor.id', 'actor.email', 'actor.fullName'])
      .orderBy('log.createdAt', 'DESC');

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query.resourceType) {
      qb.andWhere('log.resourceType = :resourceType', { resourceType: query.resourceType });
    }
    if (query.actorUserId) {
      qb.andWhere('log.actorUserId = :actorUserId', { actorUserId: query.actorUserId });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }
}
