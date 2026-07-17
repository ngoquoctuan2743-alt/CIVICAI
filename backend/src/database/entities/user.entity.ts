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

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: UserStatus, enumName: 'user_status', default: UserStatus.ACTIVE })
  status: UserStatus;

  /** RBAC: n-n với roles qua bảng nối user_roles */
  @ManyToMany(() => RoleEntity, { cascade: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: RoleEntity[];
}
