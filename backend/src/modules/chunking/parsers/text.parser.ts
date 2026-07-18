import { Injectable } from '@nestjs/common';
import { normalizeText } from '../normalization.util';
import { DocumentParser, NormalizedDocument } from '../models/normalized-document.model';
import { detectHeadingsHeuristic, detectListsHeuristic } from './heading-heuristic.util';

/** Parser cho .txt — không có cấu trúc thật, dùng heuristic dò heading/list */
@Injectable()
export class TextParser implements DocumentParser {
  readonly extensions = ['.txt'];

  async parse(buffer: Buffer, fileName: string): Promise<NormalizedDocument> {
    const plainText = normalizeText(buffer.toString('utf-8'));
    const firstLine = plainText.split('\n').find((l) => l.trim().length > 0) ?? null;

    return {
      title: firstLine?.trim().slice(0, 500) ?? null,
      plainText,
      headings: detectHeadingsHeuristic(plainText),
      tables: [],
      lists: detectListsHeuristic(plainText),
      pages: [{ pageNumber: 1, charStart: 0, charEnd: plainText.length }],
      sourceFileName: fileName,
      language: 'vi',
    };
  }
}
