import { Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import { AppException } from '../../../common/exceptions/app.exception';
import { DocumentParser } from '../models/normalized-document.model';
import { DocxParser } from './docx.parser';
import { HtmlParser } from './html.parser';
import { MarkdownParser } from './markdown.parser';
import { OcrParserStub } from './ocr.parser.stub';
import { PdfParser } from './pdf.parser';
import { TextParser } from './text.parser';

/**
 * Registry chọn DocumentParser theo đuôi file — Adapter Pattern (giữ đúng
 * tinh thần đã dùng cho LlmClient/EmbeddingProvider bên ai-service Python:
 * đổi/thêm parser mới = viết class mới implement DocumentParser + đăng ký
 * ở đây, không đổi code Chunking Engine).
 */
@Injectable()
export class ParserRegistry {
  private readonly parsers: DocumentParser[];

  constructor(
    pdfParser: PdfParser,
    docxParser: DocxParser,
    textParser: TextParser,
    markdownParser: MarkdownParser,
    htmlParser: HtmlParser,
    private readonly ocrStub: OcrParserStub,
  ) {
    this.parsers = [pdfParser, docxParser, textParser, markdownParser, htmlParser];
  }

  resolve(fileName: string): DocumentParser {
    const ext = extname(fileName).toLowerCase();
    const parser = this.parsers.find((p) => p.extensions.includes(ext));
    if (!parser) {
      throw AppException.notImplemented(
        `Chưa có parser cho định dạng "${ext}". Hỗ trợ: pdf/docx/txt/md/html. ` +
          `Nếu đây là tài liệu scan cần OCR: ${this.ocrStub.extensions.length === 0 ? 'chưa triển khai' : 'dùng OCR parser'}.`,
      );
    }
    return parser;
  }
}
