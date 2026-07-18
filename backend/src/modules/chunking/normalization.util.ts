/**
 * Chuẩn hóa văn bản trước khi chunking — Unicode, khoảng trắng, dòng gãy,
 * page break, ký tự vô hình. PHẢI giữ nguyên số hiệu pháp lý (vd "Điều 12.",
 * "Khoản 3", "a)") — không được gộp/xóa các pattern này khi collapse khoảng trắng.
 */

import { createHash } from 'node:crypto';

/** Ký tự vô hình/control thường lẫn trong PDF/DOCX export: zero-width space, BOM, soft hyphen... */
const INVISIBLE_CHARS_REGEX = /[​-‏‪-‮﻿­]/g;

/** Dấu ngắt trang phổ biến khi extract từ PDF (form feed) */
const PAGE_BREAK_REGEX = /\f/g;

/**
 * Nối dòng bị gãy giữa chừng do PDF wrap (dòng không kết thúc bằng dấu câu,
 * dòng tiếp theo bắt đầu bằng chữ thường) — heuristic, không hoàn hảo 100%.
 * KHÔNG nối nếu dòng sau khớp pattern số hiệu pháp lý (Điều/Khoản/Điểm/số thứ
 * tự) — đó là ranh giới thật, không phải dòng bị gãy.
 */
const LEGAL_NUMBERING_LINE_START = /^\s*(Điều\s+\d+|Khoản\s+\d+|[a-zđ]\)|\d+[.)]|Chương\s+[IVXLCDM\d]+|PHẦN\s+[IVXLCDM\d]+)/iu;

function dehyphenateBrokenLines(text: string): string {
  const lines = text.split('\n');
  const merged: string[] = [];
  for (const line of lines) {
    const prev = merged[merged.length - 1];
    const prevEndsUnfinished = prev && !/[.!?:;)\]"'”]\s*$/.test(prev) && prev.trim().length > 0;
    const currentLooksLikeContinuation = /^[a-zđàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/u.test(
      line.trim(),
    );
    const currentIsNewNumbering = LEGAL_NUMBERING_LINE_START.test(line);
    if (prev !== undefined && prevEndsUnfinished && currentLooksLikeContinuation && !currentIsNewNumbering) {
      merged[merged.length - 1] = `${prev} ${line.trim()}`;
    } else {
      merged.push(line);
    }
  }
  return merged.join('\n');
}

/** Chuẩn hóa toàn bộ văn bản trước khi đưa vào Chunking Engine */
export function normalizeText(raw: string): string {
  let text = raw.normalize('NFC');
  text = text.replace(INVISIBLE_CHARS_REGEX, '');
  text = text.replace(PAGE_BREAK_REGEX, '\n\n');
  text = text.replace(/\r\n/g, '\n');
  text = dehyphenateBrokenLines(text);
  // Gộp nhiều khoảng trắng liên tiếp thành 1 (KHÔNG đụng \n để giữ ranh giới đoạn/dòng)
  text = text.replace(/[ \t]+/g, ' ');
  // Gộp quá 2 dòng trống liên tiếp thành đúng 1 dòng trống
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/** SHA-256 hex của nội dung chunk đã chuẩn hóa — dùng làm checksum (dedup + idempotency) */
export function computeChunkChecksum(chunkContent: string): string {
  // Chuẩn hóa nhẹ thêm lần nữa cho mục đích so sánh dedup (bỏ khoảng trắng đầu/cuối dòng)
  const canonical = chunkContent
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
  return createHash('sha256').update(canonical).digest('hex');
}
