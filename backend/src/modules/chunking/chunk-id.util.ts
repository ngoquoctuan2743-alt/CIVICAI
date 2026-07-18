import { createHash } from 'node:crypto';

/**
 * Sinh Chunk ID DETERMINISTIC từ (documentVersionId, chunkIndex) — bắt buộc
 * theo yêu cầu Idempotency: "chạy parsing 2 lần trên cùng 1 document version
 * phải ra cùng chunk ID". KHÔNG dùng uuid_generate_v4()/randomUUID() vì mỗi
 * lần gọi sẽ ra ID khác nhau.
 *
 * Không cần tuân thủ RFC 4122 (version/variant bits) — chỉ cần format hợp
 * lệ cho cột kiểu `uuid` của Postgres (8-4-4-4-12 hex) VÀ ổn định tuyệt đối
 * theo input.
 */
export function deterministicChunkId(documentVersionId: string, chunkIndex: number): string {
  const hex = createHash('sha256').update(`${documentVersionId}:${chunkIndex}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
