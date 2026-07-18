import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { AppException } from '../../../common/exceptions/app.exception';
import { DocumentParser, NormalizedDocument } from '../models/normalized-document.model';
import { extractStructureFromHtml } from './html-structure.util';

/**
 * Parser cho .docx — mammoth chuyển DOCX -> HTML (giữ nguyên heading/table/
 * list thật từ style Word), sau đó tái dùng extractStructureFromHtml (cùng
 * logic với HtmlParser) thay vì viết lại lần 2.
 */
@Injectable()
export class DocxParser implements DocumentParser {
  readonly extensions = ['.docx'];

  async parse(buffer: Buffer, fileName: string): Promise<NormalizedDocument> {
    let html: string;
    try {
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value;
    } catch (error) {
      throw AppException.badRequest(`Không đọc được nội dung file DOCX "${fileName}": ${(error as Error).message}`);
    }
    return extractStructureFromHtml(html, fileName, 'vi');
  }
}
