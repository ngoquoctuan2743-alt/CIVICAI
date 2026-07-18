import { NormalizedDocument, NormalizedHeading, NormalizedList } from './models/normalized-document.model';

export interface ChunkingConfig {
  /** Kích thước mục tiêu (ký tự) — chunk nhỏ hơn max thì KHÔNG bị cắt thêm dù chưa đạt target */
  targetChunkSize: number;
  /** Kích thước tối đa — vượt ngưỡng này mới bị cắt tiếp (sub-split) */
  maxChunkSize: number;
  /** Độ chồng lấn (ký tự) giữa các sub-chunk khi PHẢI cắt nhỏ 1 đơn vị quá lớn */
  overlapSize: number;
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  targetChunkSize: 700,
  maxChunkSize: 1500,
  overlapSize: 100,
};

export interface RawChunk {
  content: string;
  charStart: number;
  charEnd: number;
  pageNumber: number | null;
  sectionTitle: string | null;
  headingPath: string[];
}

const LEGAL_ARTICLE_RE = /^Điều\s+\d+/iu;

function pageForOffset(pages: NormalizedDocument['pages'], offset: number): number | null {
  const page = pages.find((p) => offset >= p.charStart && offset <= p.charEnd);
  return page?.pageNumber ?? pages[pages.length - 1]?.pageNumber ?? null;
}

/** Đường dẫn heading (cha -> con) dẫn tới vị trí `offset`, dùng stack theo level */
function headingPathAt(headings: NormalizedHeading[], offset: number): string[] {
  const stack: NormalizedHeading[] = [];
  for (const h of headings) {
    if (h.charStart > offset) break;
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    stack.push(h);
  }
  return stack.map((h) => h.text);
}

/**
 * Chia 1 đoạn text quá lớn (>maxChunkSize) thành các sub-chunk theo
 * target/overlap, ưu tiên cắt tại ranh giới câu — và KHÔNG BAO GIỜ cắt vào
 * giữa 1 khối `NormalizedList` (dò trong `lists`, offset tuyệt đối so với
 * plainText gốc — `unitCharStart` là offset bắt đầu của `text` trong đó).
 */
function splitOversized(
  text: string,
  unitCharStart: number,
  lists: NormalizedList[],
  config: ChunkingConfig,
): Array<{ content: string; charStart: number; charEnd: number }> {
  const { targetChunkSize, overlapSize } = config;
  if (text.length <= config.maxChunkSize) {
    return [{ content: text, charStart: unitCharStart, charEnd: unitCharStart + text.length }];
  }

  const relevantLists = lists.filter((l) => l.charStart < unitCharStart + text.length && l.charEnd > unitCharStart);

  const results: Array<{ content: string; charStart: number; charEnd: number }> = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + targetChunkSize, text.length);
    if (end < text.length) {
      // Lùi về dấu kết câu gần nhất trong nửa sau của đoạn
      const searchFrom = start + Math.floor(targetChunkSize / 2);
      const boundary = Math.max(
        text.lastIndexOf('. ', end) >= searchFrom ? text.lastIndexOf('. ', end) : -1,
        text.lastIndexOf('.\n', end) >= searchFrom ? text.lastIndexOf('.\n', end) : -1,
      );
      if (boundary > start) end = boundary + 1;
    }

    // Không cắt giữa 1 list — nếu điểm cắt rơi vào giữa list, đẩy ra hết list đó
    const absoluteEnd = unitCharStart + end;
    const list = relevantLists.find((l) => absoluteEnd > l.charStart && absoluteEnd < l.charEnd);
    if (list) {
      end = Math.min(list.charEnd - unitCharStart, text.length);
    }

    const content = text.slice(start, end).trim();
    if (content) {
      results.push({ content, charStart: unitCharStart + start, charEnd: unitCharStart + end });
    }
    if (end >= text.length) break;
    start = Math.max(end - overlapSize, start + 1);
  }
  return results;
}

/**
 * Chunking Engine — 3 chiến lược, chọn tự động theo cấu trúc tài liệu:
 * 1. Legal-article-aware: có heading dạng "Điều N" -> mỗi Điều là 1 đơn vị
 *    nguyên vẹn (never split in the middle of an Article).
 * 2. Heading-aware: có heading (không phải dạng luật) -> mỗi section dưới
 *    1 heading là 1 đơn vị.
 * 3. Paragraph-aware: không có heading nào -> mỗi đoạn văn (`\n\n`) là 1
 *    đơn vị.
 * Đơn vị vượt quá maxChunkSize mới bị cắt tiếp (sub-split, có overlap) —
 * KHÔNG gộp nhiều đơn vị khác heading vào 1 chunk (giữ Section Title/Heading
 * Path chính xác cho từng chunk, đúng yêu cầu metadata).
 */
export function chunkNormalizedDocument(doc: NormalizedDocument, config: ChunkingConfig): RawChunk[] {
  const { plainText, headings, lists, pages } = doc;
  if (!plainText.trim()) return [];

  const isLegal = headings.some((h) => LEGAL_ARTICLE_RE.test(h.text));
  const structuralHeadings = isLegal ? headings.filter((h) => LEGAL_ARTICLE_RE.test(h.text) || h.level === 1) : headings;

  type Boundary = { charStart: number };
  let boundaries: Boundary[];

  if (structuralHeadings.length > 0) {
    boundaries = [...structuralHeadings].sort((a, b) => a.charStart - b.charStart);
    if (boundaries[0].charStart > 0) {
      boundaries = [{ charStart: 0 }, ...boundaries];
    }
  } else {
    // Paragraph-aware: ranh giới là mỗi đoạn văn cách nhau bởi dòng trống
    boundaries = [{ charStart: 0 }];
    const paraRe = /\n{2,}/g;
    let match: RegExpExecArray | null;
    while ((match = paraRe.exec(plainText)) !== null) {
      boundaries.push({ charStart: match.index + match[0].length });
    }
  }

  const units: Array<{ charStart: number; charEnd: number }> = boundaries.map((b, i) => ({
    charStart: b.charStart,
    charEnd: i + 1 < boundaries.length ? boundaries[i + 1].charStart : plainText.length,
  }));

  const chunks: RawChunk[] = [];
  for (const unit of units) {
    const text = plainText.slice(unit.charStart, unit.charEnd).trim();
    if (!text) continue;
    const leadingWs = plainText.slice(unit.charStart).length - plainText.slice(unit.charStart).trimStart().length;
    const realStart = unit.charStart + leadingWs;

    const subChunks = splitOversized(text, realStart, lists, config);
    for (const sub of subChunks) {
      chunks.push({
        content: sub.content,
        charStart: sub.charStart,
        charEnd: sub.charEnd,
        pageNumber: pageForOffset(pages, sub.charStart),
        headingPath: headingPathAt(headings, sub.charStart),
        sectionTitle: headingPathAt(headings, sub.charStart).at(-1) ?? doc.title ?? null,
      });
    }
  }
  return chunks;
}
