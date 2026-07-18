import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { DocumentParser, NormalizedDocument } from '../models/normalized-document.model';
import { extractStructureFromHtml } from './html-structure.util';

/** Parser cho .html/.htm — dùng cheerio đọc thẻ heading/table/list thật, không heuristic */
@Injectable()
export class HtmlParser implements DocumentParser {
  readonly extensions = ['.html', '.htm'];

  async parse(buffer: Buffer, fileName: string): Promise<NormalizedDocument> {
    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);
    const language = $('html').attr('lang')?.slice(0, 2) ?? 'vi';
    return extractStructureFromHtml(html, fileName, language);
  }
}
