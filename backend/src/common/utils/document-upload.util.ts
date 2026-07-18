import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { AppException } from '../exceptions/app.exception';

/**
 * Validate + lưu file tài liệu (PDF/DOCX/TXT/MD/HTML) lên storage local —
 * dùng cho Document Ingestion Pipeline (kho tri thức RAG). Tách khỏi
 * `image-upload.util.ts` vì tập mime-type/magic-bytes khác hẳn (không phải
 * ảnh) — không sửa file ảnh hiện có để tránh ảnh hưởng OCR/avatar đang chạy.
 *
 * Kiến trúc lưu trữ hiện tại: local disk (đúng theo `docs/rag-architecture-v2.md`
 * mục Storage — chưa cần Object Storage/S3 ở quy mô này). Khi cần S3/MinIO,
 * thay 2 hàm side-effect dưới đây bằng driver mới, giữ nguyên chữ ký hàm.
 */

export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.html', '.htm'] as const;
export type AllowedDocumentExtension = (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number];

/** mimetype tham khảo hiển thị lỗi — KHÔNG dùng để quyết định hợp lệ (client có thể khai sai) */
const EXTENSION_HINT_MIME_TYPES: Record<AllowedDocumentExtension, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
};

/**
 * Kiểm tra nội dung file khớp định dạng theo ĐUÔI FILE — không tin mimetype
 * client khai báo (giống nguyên tắc image-upload.util.ts).
 * - PDF/DOCX có magic bytes rõ ràng -> kiểm tra byte đầu.
 * - TXT/MD/HTML không có magic bytes chuẩn -> chấp nhận nếu decode UTF-8 được
 *   (loại file nhị phân giả mạo đuôi .txt/.md/.html).
 */
function contentMatchesExtension(buf: Buffer, ext: AllowedDocumentExtension): boolean {
  if (ext === '.pdf') {
    return buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  if (ext === '.docx') {
    // DOCX là file ZIP (Office Open XML) — magic bytes ZIP: PK\x03\x04
    return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  }
  // .txt/.md/.html/.htm — không có magic bytes chuẩn, coi hợp lệ nếu là văn bản UTF-8 hợp lệ
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

/** Kiểm tra file tài liệu hợp lệ: có mặt, không rỗng, đuôi hỗ trợ, nội dung khớp đuôi, không vượt dung lượng */
export function validateDocumentFile(
  file: Express.Multer.File | undefined,
  maxSizeBytes: number,
  missingFileMessage: string,
): asserts file is Express.Multer.File {
  if (!file) {
    throw AppException.badRequest(missingFileMessage);
  }
  if (file.size === 0) {
    throw AppException.badRequest(`File "${file.originalname}" rỗng, không thể tải lên`);
  }
  const ext = extname(file.originalname).toLowerCase() as AllowedDocumentExtension;
  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
    throw AppException.badRequest(
      `Định dạng file không hỗ trợ: "${file.originalname}". Chỉ chấp nhận: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`,
    );
  }
  if (!contentMatchesExtension(file.buffer, ext)) {
    throw AppException.badRequest(
      `Nội dung file "${file.originalname}" không khớp định dạng khai báo (${EXTENSION_HINT_MIME_TYPES[ext]}). File có thể bị hỏng hoặc giả mạo.`,
    );
  }
  if (file.size > maxSizeBytes) {
    throw AppException.badRequest(
      `File "${file.originalname}" vượt quá dung lượng tối đa ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
    );
  }
}

/** SHA-256 hex của nội dung file — dùng phát hiện trùng lặp (duplicate detection) */
export function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Lưu file đã validate vào `<uploadDir>/<subdir>/<uuid>.<ext>`, trả về storage key tương đối */
export async function saveDocumentToDisk(
  file: Express.Multer.File,
  uploadDir: string,
  subdir: string,
): Promise<string> {
  await mkdir(join(uploadDir, subdir), { recursive: true });
  const storageKey = `${subdir}/${randomUUID()}${extname(file.originalname)}`;
  await writeFile(join(uploadDir, storageKey), file.buffer);
  return storageKey;
}
