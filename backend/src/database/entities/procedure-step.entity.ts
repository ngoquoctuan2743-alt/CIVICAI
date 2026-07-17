import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { AdministrativeProcedureEntity } from './administrative-procedure.entity';

/**
 * Bảng procedure_steps — các bước thực hiện của một thủ tục (hướng dẫn từng bước).
 */
@Entity('procedure_steps')
@Unique('uq_procedure_steps_order', ['procedureId', 'stepNumber'])
export class ProcedureStepEntity extends BaseDbEntity {
  @Index('idx_procedure_steps_procedure')
  @Column({ name: 'procedure_id', type: 'uuid' })
  procedureId: string;

  @ManyToOne(() => AdministrativeProcedureEntity, (p) => p.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'procedure_id' })
  procedure: AdministrativeProcedureEntity;

  /** Thứ tự bước, bắt đầu từ 1 */
  @Column({ name: 'step_number', type: 'int' })
  stepNumber: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
