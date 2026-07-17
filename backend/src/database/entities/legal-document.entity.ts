import { Column, Entity, Index } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { LegalDocStatus, LegalDocType } from './enums';

/**
 * Bảng legal_documents — kho văn bản pháp luật (luật, nghị định, thông tư...).
 * Là nguồn trích dẫn của AI khi trả lời (qua kb_chunks).
 */
@Entity('legal_documents')
export class LegalDocumentEntity extends BaseDbEntity {
  /** Số hiệu văn bản, vd: 68/2020/QH14 */
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Index('idx_legal_documents_type')
  @Column({ name: 'doc_type', type: 'enum', enum: LegalDocType, enumName: 'legal_doc_type' })
  docType: LegalDocType;

  /** Cơ quan ban hành */
  @Column({ name: 'issuing_body', type: 'varchar', length: 255 })
  issuingBody: string;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate: string | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  /** AI chỉ được trích dẫn văn bản CON_HIEU_LUC */
  @Index('idx_legal_documents_status')
  @Column({
    type: 'enum',
    enum: LegalDocStatus,
    enumName: 'legal_doc_status',
    default: LegalDocStatus.CON_HIEU_LUC,
  })
  status: LegalDocStatus;

  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl: string | null;

  /** Tóm tắt nội dung — hiển thị trong kết quả tra cứu */
  @Column({ type: 'text', nullable: true })
  summary: string | null;
}
