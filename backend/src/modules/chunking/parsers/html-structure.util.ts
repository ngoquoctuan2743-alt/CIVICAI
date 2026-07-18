import * as cheerio from 'cheerio';
import { normalizeText } from '../normalization.util';
import {
  NormalizedDocument,
  NormalizedHeading,
  NormalizedList,
  NormalizedTable,
} from '../models/normalized-document.model';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
 * Trích cấu trúc (heading/table/list) từ HTML — dùng chung cho HtmlParser
 * (file .html thật) VÀ DocxParser (mammoth chuyển .docx -> HTML trước, giữ
 * nguyên thẻ heading/table/list, nên tái dùng đúng logic này thay vì viết
 * lại lần 2).
 */
export function extractStructureFromHtml(
  html: string,
  fileName: string,
  language: string,
): NormalizedDocument {
  const $ = cheerio.load(html);
  const headings: NormalizedHeading[] = [];
  const tables: NormalizedTable[] = [];
  const lists: NormalizedList[] = [];
  const parts: string[] = [];
  let offset = 0;

  const appendPart = (rawText: string): number => {
    const text = normalizeText(rawText);
    if (!text) return offset;
    const charStart = offset;
    parts.push(text);
    offset += text.length + 2;
    return charStart;
  };

  const titleTag = $('title').first().text().trim();
  const firstH1 = $('h1').first().text().trim();
  const title = (titleTag || firstH1 || null) as string | null;

  $('h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote').each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (!tag) return;
    const $el = $(el);

    if (HEADING_TAGS.includes(tag)) {
      const text = $el.text().trim();
      if (!text) return;
      const charStart = appendPart(text);
      headings.push({ level: Number(tag[1]), text, charStart, pageNumber: null });
      return;
    }
    if (tag === 'table') {
      const rows: string[][] = [];
      $el.find('tr').each((__, tr) => {
        const cells: string[] = [];
        $(tr)
          .find('th, td')
          .each((___, cell) => {
            cells.push($(cell).text().trim());
          });
        if (cells.length > 0) rows.push(cells);
      });
      if (rows.length === 0) return;
      const charStart = appendPart(rows.map((r) => r.join(' | ')).join('\n'));
      tables.push({ pageNumber: null, charStart, rows });
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items: string[] = [];
      $el.children('li').each((__, li) => {
        items.push($(li).text().trim());
      });
      if (items.length === 0) return;
      const charStart = appendPart(items.join('\n'));
      lists.push({ ordered: tag === 'ol', items, charStart, charEnd: offset - 2 });
      return;
    }
    const text = $el.text().trim();
    if (text) appendPart(text);
  });

  const plainText = parts.join('\n\n');

  return {
    title,
    plainText,
    headings,
    tables,
    lists,
    pages: [{ pageNumber: 1, charStart: 0, charEnd: plainText.length }],
    sourceFileName: fileName,
    language,
  };
}
