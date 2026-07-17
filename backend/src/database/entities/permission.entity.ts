import { Column, Entity } from 'typeorm';
import { BaseDbEntity } from './base.entity';

/**
 * Bảng permissions — quyền chi tiết theo module (RBAC).
 * Quy ước code: <module>.<action>, vd: procedures.read, users.manage
 */
@Entity('permissions')
export class PermissionEntity extends BaseDbEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Module nghiệp vụ mà quyền thuộc về */
  @Column({ type: 'varchar', length: 50 })
  module: string;
}
