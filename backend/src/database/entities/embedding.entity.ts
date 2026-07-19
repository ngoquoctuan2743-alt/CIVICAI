import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DocumentChunkEntity } from './document-chunk.entity';
import { EmbeddingStatus } from './enums';
import { KnowledgeDocumentVersionEntity } from './knowledge-document-version.entity';

/**
 * Bảng embeddings — 1 dòng = 1 EMBEDDING VERSION của 1 chunk (Embedding +
 * EmbeddingVersion gộp làm 1 — tách bảng riêng chỉ tạo JOIN 1-1 vô nghĩa,
 * giống lý do gộp ChunkMetadata vào DocumentChunk ở Prompt 03). Unique
 * (chunk_id, embedding_model, embedding_model_version) đảm bảo Idempotency
 * — embed lại đúng model/version không tạo dòng mới. Đổi model/version
 * khác -> dòng MỚI, dòng cũ vẫn giữ nguyên (Never overwrite) — `isActive`
 * quyết định dòng nào đang phục vụ retrieval.
 *
 * CỘT VECTOR (`vector(N)` pgvector) KHÔNG khai báo qua @Column ở đây —
 * TypeORM không có type gốc cho `vector`, và để tránh rủi ro serialize sai
 * khi generate/chạy migration, cột này được tạo bằng raw SQL (xem migration
 * AddEmbeddingPipeline) và ĐỌC/GHI hoàn toàn qua raw SQL trong
 * EmbeddingQueueService — giống hệt cách ai-service Python (`PgVectorStore`)
 * đã làm cho `kb_chunks.embedding`.
 *
 * ⚠️ CẢNH BÁO QUAN TRỌNG: vì cột `vector` + index HNSW không nằm trong
 * entity, `npm run migration:generate` SẼ LUÔN đề xuất 1 migration XÓA cả
 * 2 (đã gặp thật, đã xóa migration đó ngay, không chạy). MỌI LẦN chạy
 * `migration:generate` sau này (kể cả cho tính năng không liên quan), PHẢI
 * kiểm tra migration sinh ra có đụng tới bảng `embeddings` không — nếu có
 * lệnh `DROP COLUMN "vector"` hoặc `DROP INDEX "idx_embeddings_vector_hnsw"`
 * thì xóa file migration đó đi, KHÔNG chạy.
 */
@Entity('embeddings')
@Index('uq_embeddings_chunk_model_version', ['chunkId', 'embeddingModel', 'embeddingModelVersion'], { unique: true })
export class EmbeddingEntity {
  /** Deterministic — hash(chunkId:embeddingModel:embeddingModelVersion), xem embedding-id.util.ts */
  @PrimaryColumn('uuid')
  id: string;

  @Index('idx_embeddings_chunk')
  @Column({ name: 'chunk_id', type: 'uuid' })
  chunkId: string;

  @ManyToOne(() => DocumentChunkEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chunk_id' })
  chunk: DocumentChunkEntity;

  @Index('idx_embeddings_version')
  @Column({ name: 'document_version_id', type: 'uuid' })
  documentVersionId: string;

  @ManyToOne(() => KnowledgeDocumentVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_version_id' })
  documentVersion: KnowledgeDocumentVersionEntity;

  @Column({ name: 'embedding_model', type: 'varchar', length: 50 })
  embeddingModel: string;

  @Column({ name: 'embedding_model_version', type: 'varchar', length: 100 })
  embeddingModelVersion: string;

  @Column({ type: 'integer' })
  dimension: number;

  /** SHA-256 nội dung chunk TẠI THỜI ĐIỂM embed — phát hiện chunk đã đổi nội dung (cần reindex) */
  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @Index('idx_embeddings_status')
  @Column({
    type: 'enum',
    enum: EmbeddingStatus,
    enumName: 'embedding_status',
    default: EmbeddingStatus.PENDING,
  })
  status: EmbeddingStatus;

  /** Version đang phục vụ retrieval cho chunk này — chỉ 1 dòng active tại 1 thời điểm cho mỗi (chunk, model) */
  @Index('idx_embeddings_active')
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
