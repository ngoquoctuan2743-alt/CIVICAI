import { createHash } from 'node:crypto';

export interface EmbeddingValidationResult {
  valid: boolean;
  reason: string | null;
}

/**
 * Kiểm tra vector hợp lệ TRƯỚC khi lưu (Security/Validation requirement):
 * đúng số chiều, không rỗng, không chứa NaN/Infinity. Không kiểm tra
 * checksum ở đây — checksum verify là so sánh với giá trị đã tính trước
 * (xem `verifyChecksum`), tách riêng vì cần thêm tham số checksum kỳ vọng.
 */
export function validateEmbeddingVector(values: number[], expectedDimension: number): EmbeddingValidationResult {
  if (!values || values.length === 0) {
    return { valid: false, reason: 'Vector rỗng — provider trả về mảng không có phần tử nào' };
  }
  if (values.length !== expectedDimension) {
    return {
      valid: false,
      reason: `Sai số chiều: kỳ vọng ${expectedDimension}, thực tế ${values.length}`,
    };
  }
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) {
      return { valid: false, reason: `Giá trị không hợp lệ tại vị trí ${i}: ${v}` };
    }
  }
  return { valid: true, reason: null };
}

/** SHA-256 nội dung chunk — dùng làm checksum lưu kèm embedding (phát hiện chunk đổi nội dung cần reindex) */
export function computeEmbeddingChecksum(chunkContent: string): string {
  return createHash('sha256').update(chunkContent).digest('hex');
}

/** Verify checksum hiện tại của chunk còn khớp với checksum lúc embed hay không */
export function verifyChecksum(chunkContent: string, expectedChecksum: string): boolean {
  return computeEmbeddingChecksum(chunkContent) === expectedChecksum;
}

/** Chuyển mảng số thành literal pgvector `[0.1,0.2,...]` để dùng trong raw SQL */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}
