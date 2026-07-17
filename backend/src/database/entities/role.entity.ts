import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { PermissionEntity } from './permission.entity';

/**
 * Bảng roles — vai trò RBAC. Seed: ADMIN, CITIZEN.
 */
@Entity('roles')
export class RoleEntity extends BaseDbEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  /** n-n với permissions qua bảng nối role_permissions */
  @ManyToMany(() => PermissionEntity)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: PermissionEntity[];
}
