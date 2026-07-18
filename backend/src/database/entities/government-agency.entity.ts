import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { AgencyLevel } from './enums';

/**
 * Bảng government_agencies — danh bạ cơ quan nhà nước.
 * Phục vụ tra cứu "nộp hồ sơ ở đâu, liên hệ thế nào".
 */
@Entity('government_agencies')
export class GovernmentAgencyEntity extends BaseDbEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_gov_agencies_level')
  @Column({ type: 'enum', enum: AgencyLevel, enumName: 'agency_level' })
  level: AgencyLevel;

  /** Cơ quan cấp trên (self-reference) */
  @Index('idx_gov_agencies_parent')
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => GovernmentAgencyEntity, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: GovernmentAgencyEntity | null;

  /** Địa bàn quản lý (tỉnh/xã) — null với cơ quan trung ương */
  @Column({ name: 'admin_unit_id', type: 'uuid', nullable: true })
  adminUnitId: string | null;

  @ManyToOne(() => AdministrativeUnitEntity, { nullable: true })
  @JoinColumn({ name: 'admin_unit_id' })
  adminUnit: AdministrativeUnitEntity | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  /** Giờ làm việc, vd: "Thứ 2 - Thứ 6, 7:30 - 17:00" */
  @Column({ name: 'working_hours', type: 'varchar', length: 255, nullable: true })
  workingHours: string | null;
}
