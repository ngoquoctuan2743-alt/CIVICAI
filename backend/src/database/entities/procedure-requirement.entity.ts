import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { AdministrativeProcedureEntity } from './administrative-procedure.entity';
import { RequirementType } from './enums';

/**
 * Bảng procedure_requirements — giấy tờ cần nộp / điều kiện cần đáp ứng
 * của một thủ tục. AI dùng để liệt kê "cần chuẩn bị gì".
 */
@Entity('procedure_requirements')
export class ProcedureRequirementEntity extends BaseDbEntity {
  @Index('idx_procedure_requirements_procedure')
  @Column({ name: 'procedure_id', type: 'uuid' })
  procedureId: string;

  @ManyToOne(() => AdministrativeProcedureEntity, (p) => p.requirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'procedure_id' })
  procedure: AdministrativeProcedureEntity;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({
    name: 'requirement_type',
    type: 'enum',
    enum: RequirementType,
    enumName: 'requirement_type',
    default: RequirementType.DOCUMENT,
  })
  requirementType: RequirementType;

  /** Số lượng bản (với giấy tờ) */
  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
