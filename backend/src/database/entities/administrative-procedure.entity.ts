import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { GovernmentAgencyEntity } from './government-agency.entity';
import { OnlineLevel, ProcedureStatus } from './enums';
import { ProcedureRequirementEntity } from './procedure-requirement.entity';
import { ProcedureStepEntity } from './procedure-step.entity';

/**
 * Bảng administrative_procedures — danh mục thủ tục hành chính.
 * Lõi nghiệp vụ "hỗ trợ người dân thực hiện thủ tục dịch vụ công".
 */
@Entity('administrative_procedures')
export class AdministrativeProcedureEntity extends BaseDbEntity {
  /** Mã TTHC (theo CSDL quốc gia về TTHC nếu có) */
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Index('idx_procedures_name')
  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Lĩnh vực thủ tục, vd: "Hộ tịch", "Cư trú", "Xuất nhập cảnh" — phục vụ lọc/phân loại */
  @Index('idx_procedures_category')
  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string | null;

  /** Kết quả thực hiện thủ tục, vd: "Thẻ căn cước công dân", "Giấy khai sinh" */
  @Column({ name: 'expected_result', type: 'varchar', length: 500, nullable: true })
  expectedResult: string | null;

  /** Cơ quan thực hiện */
  @Index('idx_procedures_agency')
  @Column({ name: 'agency_id', type: 'uuid', nullable: true })
  agencyId: string | null;

  @ManyToOne(() => GovernmentAgencyEntity, { nullable: true })
  @JoinColumn({ name: 'agency_id' })
  agency: GovernmentAgencyEntity | null;

  @Column({
    name: 'online_level',
    type: 'enum',
    enum: OnlineLevel,
    enumName: 'online_level',
    nullable: true,
  })
  onlineLevel: OnlineLevel | null;

  /** Lệ phí (dạng text vì nhiều thủ tục có biểu phí phức tạp) */
  @Column({ name: 'fee_text', type: 'varchar', length: 500, nullable: true })
  feeText: string | null;

  /** Thời hạn giải quyết, vd: "07 ngày làm việc" */
  @Column({ name: 'processing_time_text', type: 'varchar', length: 255, nullable: true })
  processingTimeText: string | null;

  /** Căn cứ pháp lý (text mô tả; liên kết chi tiết qua kb_chunks) */
  @Column({ name: 'legal_basis_text', type: 'text', nullable: true })
  legalBasisText: string | null;

  @Column({
    type: 'enum',
    enum: ProcedureStatus,
    enumName: 'procedure_status',
    default: ProcedureStatus.ACTIVE,
  })
  status: ProcedureStatus;

  @OneToMany(() => ProcedureStepEntity, (step) => step.procedure)
  steps: ProcedureStepEntity[];

  @OneToMany(() => ProcedureRequirementEntity, (req) => req.procedure)
  requirements: ProcedureRequirementEntity[];
}
