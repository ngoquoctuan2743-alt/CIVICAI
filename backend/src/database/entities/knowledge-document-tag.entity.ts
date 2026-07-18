import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { KnowledgeDocumentEntity } from './knowledge-document.entity';

/**
 * Bảng knowledge_document_tags — nhãn tự do gắn vào knowledge_documents
 * (nhiều-nhiều dạng đơn giản: 1 dòng = 1 tag của 1 document, không quản lý
 * danh mục tag riêng vì tag ở đây chỉ là nhãn tự do do Admin đặt, không cần
 * metadata thêm — theo đúng tinh thần tối giản của dự án).
 */
@Entity('knowledge_document_tags')
@Index('uq_kdoc_tags_document_name', ['documentId', 'tagName'], { unique: true })
export class KnowledgeDocumentTagEntity extends BaseDbEntity {
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => KnowledgeDocumentEntity, (d) => d.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KnowledgeDocumentEntity;

  @Column({ name: 'tag_name', type: 'varchar', length: 100 })
  tagName: string;
}
