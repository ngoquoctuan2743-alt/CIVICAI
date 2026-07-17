import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { KbSourceType } from './enums';

/**
 * Bảng kb_chunks — đoạn văn bản tri thức đã cắt nhỏ + embedding, phục vụ RAG.
 *
 * Nguồn (polymorphic nhẹ): source_type + source_id trỏ tới
 * legal_documents / administrative_procedures / government_agencies.
 *
 * LƯU Ý embedding: PHASE 1 lưu dạng mảng float4 (TypeORM hỗ trợ trực tiếp).
 * PHASE 4 (AI Service) sẽ có migration chuyển sang kiểu `vector(384)` của
 * pgvector + index HNSW để similarity search — extension đã được bật sẵn.
 */
@Entity('kb_chunks')
@Unique('uq_kb_chunks_source_index', ['sourceType', 'sourceId', 'chunkIndex'])
export class KbChunkEntity extends BaseDbEntity {
  @Index('idx_kb_chunks_source')
  @Column({ name: 'source_type', type: 'enum', enum: KbSourceType, enumName: 'kb_source_type' })
  sourceType: KbSourceType;

  /** id của bản ghi nguồn (không FK cứng vì nguồn đa hình) */
  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  /** Thứ tự đoạn trong tài liệu nguồn, bắt đầu từ 0 */
  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  /** Vector 384 chiều (multilingual-e5-small) — null khi chưa index */
  @Column({ type: 'float4', array: true, nullable: true })
  embedding: number[] | null;

  @Column({ name: 'token_count', type: 'int', nullable: true })
  tokenCount: number | null;
}
