import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { AdminUnitType } from './enums';

/**
 * Bảng administrative_units — danh mục đơn vị hành chính 2 cấp
 * (34 tỉnh/thành -> xã/phường, theo cải cách hiệu lực 01/07/2025).
 */
@Entity('administrative_units')
export class AdministrativeUnitEntity extends BaseDbEntity {
  /** Mã đơn vị hành chính theo chuẩn thống kê */
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index('idx_admin_units_type')
  @Column({ type: 'enum', enum: AdminUnitType, enumName: 'admin_unit_type' })
  type: AdminUnitType;

  /** Xã/phường trỏ về tỉnh/thành cha; tỉnh/thành có parent = null */
  @Index('idx_admin_units_parent')
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => AdministrativeUnitEntity, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: AdministrativeUnitEntity | null;
}
