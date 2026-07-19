import { createHash } from 'node:crypto';

/**
 * Sinh Embedding ID DETERMINISTIC từ (chunkId, embeddingModel,
 * embeddingModelVersion) — bắt buộc theo yêu cầu Idempotency: "embed lại
 * đúng chunk/model/version không bao giờ tạo trùng". Cùng kỹ thuật với
 * `deterministicChunkId` (Prompt 03).
 */
export function deterministicEmbeddingId(chunkId: string, embeddingModel: string, embeddingModelVersion: string): string {
  const hex = createHash('sha256').update(`${chunkId}:${embeddingModel}:${embeddingModelVersion}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
