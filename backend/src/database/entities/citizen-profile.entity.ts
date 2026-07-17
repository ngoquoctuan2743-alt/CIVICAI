import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { AuditableEntity } from './base.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { Gender } from './enums';
import { UserEntity } from './user.entity';

/**
 * Bảng citizen_profiles — hồ sơ công dân (PII nhạy cảm), quan hệ 1-1 với users.
 * Tách khỏi bảng users để cô lập dữ liệu cá nhân và kiểm soát quyền đọc.
 */
@Entity('citizen_profiles')
export class CitizenProfileEntity extends AuditableEntity {
  @Index('uq_citizen_profiles_user', { unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /** Số CCCD — unique trong số bản ghi chưa xóa. TODO(security): cân nhắc mã hóa cột */
  @Index('uq_citizen_profiles_national_id', { unique: true, where: '"deleted_at" IS NULL' })
  @Column({ name: 'national_id', type: 'varchar', length: 20, nullable: true })
  nationalId: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'enum', enum: Gender, enumName: 'gender', nullable: true })
  gender: Gender | null;

  /** Tỉnh/thành nơi cư trú */
  @Column({ name: 'province_id', type: 'uuid', nullable: true })
  provinceId: string | null;

  @ManyToOne(() => AdministrativeUnitEntity, { nullable: true })
  @JoinColumn({ name: 'province_id' })
  province: AdministrativeUnitEntity | null;

  /** Xã/phường nơi cư trú */
  @Column({ name: 'ward_id', type: 'uuid', nullable: true })
  wardId: string | null;

  @ManyToOne(() => AdministrativeUnitEntity, { nullable: true })
  @JoinColumn({ name: 'ward_id' })
  ward: AdministrativeUnitEntity | null;

  @Column({ name: 'address_detail', type: 'varchar', length: 500, nullable: true })
  addressDetail: string | null;
}
