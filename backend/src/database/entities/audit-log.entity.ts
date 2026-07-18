import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng audit_logs — nhật ký hoạt động hệ thống (ai làm gì, khi nào), khác với
 * created_by/updated_by trên từng bảng (chỉ ghi ai sửa DÒNG DỮ LIỆU đó gần nhất).
 * Append-only — không update/xóa bản ghi đã ghi.
 */
@Entity('audit_logs')
export class AuditLogEntity extends BaseDbEntity {
  /** Người thực hiện — null nếu hành động hệ thống hoặc chưa xác thực (vd: đăng nhập sai) */
  @Index('idx_audit_logs_actor')
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actor: UserEntity | null;

  /** Hành động, vd: "LOGIN", "LOGIN_FAILED", "CREATE_PROCEDURE", "DELETE_AGENCY" */
  @Index('idx_audit_logs_action')
  @Column({ type: 'varchar', length: 100 })
  action: string;

  /** Loại tài nguyên bị tác động, vd: "administrative_procedure", "user" — null nếu không áp dụng */
  @Column({ name: 'resource_type', type: 'varchar', length: 100, nullable: true })
  resourceType: string | null;

  @Index('idx_audit_logs_resource')
  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  /** Chi tiết bổ sung tự do, vd: {before: {...}, after: {...}} */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
