import { NormalizedHeading, NormalizedList } from '../models/normalized-document.model';

/**
 * Dò heading/list bằng heuristic pattern — dùng cho định dạng KHÔNG có cấu
 * trúc thật (TXT, và PDF vì pdf-parse chỉ trả text phẳng theo trang, không
 * có thẻ heading). DOCX/HTML/MD có cấu trúc thật (heading tag/AST) nên dùng
 * parser riêng chính xác hơn, không cần heuristic này.
 */

const HEADING_PATTERNS: { regex: RegExp; level: number }[] = [
  { regex: /^\s*PHẦN\s+[IVXLCDM\d]+/iu, level: 1 },
  { regex: /^\s*Chương\s+[IVXLCDM\d]+/iu, level: 1 },
  { regex: /^\s*Mục\s+\d+/iu, level: 2 },
  { regex: /^\s*Điều\s+\d+/iu, level: 2 },
  { regex: /^\s*Khoản\s+\d+/iu, level: 3 },
];

/** Dòng in hoa toàn bộ, ngắn (<= 100 ký tự), không kết thúc bằng dấu câu -> khả năng cao là tiêu đề */
function looksLikeAllCapsHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;
  if (/[.!?;:,]$/.test(trimmed)) return false;
  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

/** Dòng dạng danh sách đánh số ở đầu dòng: "1.", "2)", "a)", "-", "•" */
const LIST_ITEM_REGEX = /^\s*(?:(\d+)[.)]|([a-zđ])\)|[-•*])\s+(.+)$/iu;

export function detectHeadingsHeuristic(text: string, pageOf?: (charOffset: number) => number | null): NormalizedHeading[] {
  const headings: NormalizedHeading[] = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) {
      const matched = HEADING_PATTERNS.find((p) => p.regex.test(trimmed));
      if (matched) {
        headings.push({
          level: matched.level,
          text: trimmed,
          charStart: offset,
          pageNumber: pageOf ? pageOf(offset) : null,
        });
      } else if (looksLikeAllCapsHeading(trimmed)) {
        headings.push({ level: 1, text: trimmed, charStart: offset, pageNumber: pageOf ? pageOf(offset) : null });
      }
    }
    offset += line.length + 1; // +1 cho ký tự '\n' đã split
  }
  return headings;
}

/** Gom các dòng list-item liên tiếp thành từng khối NormalizedList */
export function detectListsHeuristic(text: string): NormalizedList[] {
  const lists: NormalizedList[] = [];
  const lines = text.split('\n');
  let offset = 0;
  let current: { ordered: boolean; items: string[]; charStart: number } | null = null;

  const flush = (endOffset: number) => {
    if (current && current.items.length >= 2) {
      lists.push({ ordered: current.ordered, items: current.items, charStart: current.charStart, charEnd: endOffset });
    }
    current = null;
  };

  for (const line of lines) {
    const match = LIST_ITEM_REGEX.exec(line);
    if (match) {
      const ordered = Boolean(match[1] || match[2]);
      const itemText = match[3] ?? line.trim();
      if (!current) {
        current = { ordered, items: [], charStart: offset };
      }
      current.items.push(itemText.trim());
    } else if (line.trim() === '') {
      // dòng trống không kết thúc list ngay — chờ dòng tiếp theo
    } else {
      flush(offset);
    }
    offset += line.length + 1;
  }
  flush(offset);
  return lists;
}
