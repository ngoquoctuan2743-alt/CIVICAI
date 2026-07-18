import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { AppException } from '../exceptions/app.exception';

/**
 * Validate + lưu file ảnh lên storage local — dùng chung cho mọi luồng upload
 * ảnh (OCR documents, avatar). Tách khỏi `common.util.ts` (chỉ pure function)
 * vì các hàm ở đây có side-effect (ghi đĩa) và ném AppException.
 */

/** Định dạng ảnh được chấp nhận trong toàn hệ thống */
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Magic bytes thật của từng định dạng — không tin mimetype do client tự khai báo */
const MAGIC_BYTE_CHECKS: Record<AllowedImageMimeType, (buf: Buffer) => boolean> = {
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  'image/webp': (buf) =>
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP',
};

/** Kiểm tra file ảnh hợp lệ: có mặt, mimetype được hỗ trợ, magic bytes khớp, không vượt dung lượng */
export function validateImageFile(
  file: Express.Multer.File | undefined,
  maxSizeBytes: number,
  missingFileMessage: string,
): asserts file is Express.Multer.File {
  if (!file) {
    throw AppException.badRequest(missingFileMessage);
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as AllowedImageMimeType)) {
    throw AppException.badRequest(
      `Định dạng ảnh không hỗ trợ: ${file.mimetype}. Chỉ chấp nhận: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
    );
  }
  const mimetype = file.mimetype as AllowedImageMimeType;
  if (!MAGIC_BYTE_CHECKS[mimetype](file.buffer)) {
    throw AppException.badRequest(
      `Nội dung file không khớp định dạng ảnh khai báo (${file.mimetype}). File có thể bị giả mạo.`,
    );
  }
  if (file.size > maxSizeBytes) {
    throw AppException.badRequest(
      `File vượt quá dung lượng tối đa ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
    );
  }
}

/** Lưu file đã validate vào `<uploadDir>/<subdir>/<uuid>.<ext>`, trả về storage key tương đối */
export async function saveImageToDisk(
  file: Express.Multer.File,
  uploadDir: string,
  subdir: string,
): Promise<string> {
  await mkdir(join(uploadDir, subdir), { recursive: true });
  const storageKey = `${subdir}/${randomUUID()}${extname(file.originalname) || '.jpg'}`;
  await writeFile(join(uploadDir, storageKey), file.buffer);
  return storageKey;
}
