import { Injectable } from '@nestjs/common';
import { normalizeText } from '../normalization.util';
import {
  DocumentParser,
  NormalizedDocument,
  NormalizedHeading,
  NormalizedList,
  NormalizedTable,
} from '../models/normalized-document.model';

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const ORDERED_ITEM_RE = /^\s*\d+[.)]\s+(.+)$/;
const UNORDERED_ITEM_RE = /^\s*[-*+]\s+(.+)$/;
const TABLE_ROW_RE = /^\s*\|?(.+)\|?\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const CODE_FENCE_RE = /^\s*```/;

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * Parser cho .md — tự viết bằng regex (không dùng thư viện `marked`: bản
 * mới nhất chỉ phát hành ESM, xung đột với Jest/ts-jest chạy CommonJS —
 * cú pháp Markdown đủ đơn giản/xác định để tự phân tích chính xác, giống
 * tinh thần dự án tự viết `chunk_text()`/Circuit Breaker thay vì phụ thuộc
 * thư viện ngoài khi không thật sự cần).
 *
 * QUAN TRỌNG: offset của heading/table/list tính theo `plainText` ĐẦU RA
 * (đã bỏ ký tự cú pháp `#`/`|`/`-`), không phải markdown gốc.
 */
@Injectable()
export class MarkdownParser implements DocumentParser {
  readonly extensions = ['.md'];

  async parse(buffer: Buffer, fileName: string): Promise<NormalizedDocument> {
    const raw = normalizeText(buffer.toString('utf-8'));
    const lines = raw.split('\n');

    const headings: NormalizedHeading[] = [];
    const tables: NormalizedTable[] = [];
    const lists: NormalizedList[] = [];
    let title: string | null = null;
    const parts: string[] = [];
    let offset = 0;

    const appendPart = (text: string): number => {
      const trimmed = text.trim();
      if (!trimmed) return offset;
      const charStart = offset;
      parts.push(trimmed);
      offset += trimmed.length + 2; // +2 vì join bằng '\n\n'
      return charStart;
    };

    let i = 0;
    let inCodeFence = false;
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        appendPart(paragraphBuffer.join(' '));
        paragraphBuffer = [];
      }
    };

    while (i < lines.length) {
      const line = lines[i];

      if (CODE_FENCE_RE.test(line)) {
        flushParagraph();
        inCodeFence = !inCodeFence;
        i++;
        continue;
      }
      if (inCodeFence) {
        paragraphBuffer.push(line);
        i++;
        continue;
      }

      const headingMatch = HEADING_RE.exec(line);
      if (headingMatch) {
        flushParagraph();
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const charStart = appendPart(text);
        headings.push({ level, text, charStart, pageNumber: null });
        if (title === null) title = text;
        i++;
        continue;
      }

      // Bảng: dòng hiện tại + dòng kế tiếp là separator (---|---) -> bắt đầu bảng
      if (i + 1 < lines.length && TABLE_ROW_RE.test(line) && TABLE_SEPARATOR_RE.test(lines[i + 1]) && line.includes('|')) {
        flushParagraph();
        const header = splitTableRow(line);
        const rows: string[][] = [header];
        i += 2;
        while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
          rows.push(splitTableRow(lines[i]));
          i++;
        }
        const charStart = appendPart(rows.map((r) => r.join(' | ')).join('\n'));
        tables.push({ pageNumber: null, charStart, rows });
        continue;
      }

      // List: gom các dòng liên tiếp cùng loại (ordered/unordered)
      const orderedMatch = ORDERED_ITEM_RE.exec(line);
      const unorderedMatch = UNORDERED_ITEM_RE.exec(line);
      if (orderedMatch || unorderedMatch) {
        flushParagraph();
        const ordered = Boolean(orderedMatch);
        const items: string[] = [(orderedMatch ?? unorderedMatch)![1].trim()];
        i++;
        while (i < lines.length) {
          const nextOrdered = ORDERED_ITEM_RE.exec(lines[i]);
          const nextUnordered = UNORDERED_ITEM_RE.exec(lines[i]);
          const next = ordered ? nextOrdered : nextUnordered;
          if (!next) break;
          items.push(next[1].trim());
          i++;
        }
        const charStart = appendPart(items.join('\n'));
        lists.push({ ordered, items, charStart, charEnd: offset - 2 });
        continue;
      }

      if (line.trim() === '') {
        flushParagraph();
        i++;
        continue;
      }

      // Blockquote — bỏ dấu '>' đầu dòng, coi như đoạn văn thường
      paragraphBuffer.push(line.replace(/^\s*>\s?/, ''));
      i++;
    }
    flushParagraph();

    const plainText = parts.join('\n\n');

    return {
      title,
      plainText,
      headings,
      tables,
      lists,
      pages: [{ pageNumber: 1, charStart: 0, charEnd: plainText.length }],
      sourceFileName: fileName,
      language: 'vi',
    };
  }
}
