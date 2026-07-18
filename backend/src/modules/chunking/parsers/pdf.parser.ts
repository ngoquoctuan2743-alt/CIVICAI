import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { AppException } from '../../../common/exceptions/app.exception';
import { normalizeText } from '../normalization.util';
import { DocumentParser, NormalizedDocument, NormalizedPage } from '../models/normalized-document.model';
import { detectHeadingsHeuristic, detectListsHeuristic } from './heading-heuristic.util';

/**
 * Parser cho .pdf — pdf-parse (pdfjs-dist) chỉ trả text phẳng theo từng
 * trang, KHÔNG có thẻ heading thật -> dùng heuristic (giống TextParser) để
 * dò heading/list. `getTable()` của pdf-parse là best-effort thật sự (PDF
 * không có khái niệm bảng ở tầng cấu trúc) — bọc try/catch, lỗi thì bỏ qua
 * bảng chứ không làm hỏng toàn bộ parse.
 */
@Injectable()
export class PdfParser implements DocumentParser {
  readonly extensions = ['.pdf'];

  async parse(buffer: Buffer, fileName: string): Promise<NormalizedDocument> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const textResult = await parser.getText();

      // Ghép text từng trang, chuẩn hóa TỪNG TRANG trước khi tính offset
      // (giống lý do đã áp dụng ở MarkdownParser/HTML) để pages[].charStart
      // khớp đúng plainText cuối cùng.
      const pages: NormalizedPage[] = [];
      const normalizedPageTexts: string[] = [];
      let offset = 0;
      for (const page of textResult.pages) {
        const text = normalizeText(page.text);
        const charStart = offset;
        normalizedPageTexts.push(text);
        offset += text.length + 2; // +2 cho separator '\n\n' giữa các trang
        pages.push({ pageNumber: page.num, charStart, charEnd: offset - 2 });
      }
      const plainText = normalizedPageTexts.join('\n\n');

      const pageOf = (charOffset: number): number | null => {
        const page = pages.find((p) => charOffset >= p.charStart && charOffset <= p.charEnd);
        return page?.pageNumber ?? pages[pages.length - 1]?.pageNumber ?? null;
      };

      const tables: NormalizedDocument['tables'] = [];
      try {
        const tableResult = await parser.getTable();
        for (const page of tableResult.pages ?? []) {
          const pageInfo = pages.find((p) => p.pageNumber === page.num);
          for (const rows of page.tables ?? []) {
            if (rows.length === 0) continue;
            tables.push({ pageNumber: page.num, charStart: pageInfo?.charStart ?? 0, rows });
          }
        }
      } catch {
        // best-effort — bảng trong PDF thường không trích xuất được chính xác, bỏ qua an toàn
      }

      const firstNonEmptyLine = plainText.split('\n').find((l) => l.trim().length > 0) ?? null;

      return {
        title: firstNonEmptyLine?.trim().slice(0, 500) ?? null,
        plainText,
        headings: detectHeadingsHeuristic(plainText, pageOf),
        tables,
        lists: detectListsHeuristic(plainText),
        pages,
        sourceFileName: fileName,
        language: 'vi',
      };
    } catch (error) {
      throw AppException.badRequest(`Không đọc được nội dung file PDF "${fileName}": ${(error as Error).message}`);
    } finally {
      await parser.destroy();
    }
  }
}
