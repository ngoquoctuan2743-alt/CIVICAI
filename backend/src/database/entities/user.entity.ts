import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { AuditableEntity } from './base.entity';
import { UserStatus } from './enums';
import { RoleEntity } from './role.entity';

/**
 * Bảng users — tài khoản đăng nhập (trung tâm định danh).
 * Thông tin công dân chi tiết nằm ở citizen_profiles (tách PII).
 */
@Entity('users')
export class UserEntity extends AuditableEntity {
  /** Email đăng nhập — unique trong số bản ghi chưa xóa */
  @Index('uq_users_email', { unique: true, where: '"deleted_at" IS NULL' })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /** Bcrypt hash — null nếu tài khoản chỉ đăng nhập qua MXH (mở rộng sau) */
  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  /** Số điện thoại — unique trong số bản ghi chưa xóa (cho phép nhiều NULL) */
  @Index('uq_users_phone', { unique: true, where: '"deleted_at" IS NULL AND "phone" IS NOT NULL' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: UserStatus, enumName: 'user_status', default: UserStatus.ACTIVE })
  status: UserStatus;

  /** Ảnh đại diện — trỏ tới URL storage (không dùng document_id vì avatar không cần OCR/metadata) */
  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  /** SHA-256 hash token đặt lại mật khẩu — chỉ 1 token hiệu lực tại 1 thời điểm (khác refresh_tokens hỗ trợ nhiều phiên) */
  @Column({ name: 'reset_token_hash', type: 'varchar', length: 128, nullable: true })
  resetTokenHash: string | null;

  @Column({ name: 'reset_token_expires_at', type: 'timestamptz', nullable: true })
  resetTokenExpiresAt: Date | null;

  /** RBAC: n-n với roles qua bảng nối user_roles */
  @ManyToMany(() => RoleEntity, { cascade: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: RoleEntity[];
}
