/**
 * Worker thread thực thi Parse + Chunk cách ly khỏi main thread — cho phép
 * enforce giới hạn bộ nhớ THẬT (resourceLimits.maxOldGenerationSizeMb, set
 * ở nơi spawn worker trong ChunkProcessingQueueService) và không làm treo
 * event loop chính khi xử lý file lớn. KHÔNG dùng Nest DI ở đây (worker
 * thread độc lập) — các parser class không có dependency nào nên khởi tạo
 * trực tiếp bằng `new` vẫn đúng.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { extname } from 'node:path';
// .mts là ES Module thật — resolver ESM bắt buộc extension tường minh,
// khác với .ts thường (CommonJS/TS-classic cho phép bỏ extension). Viết
// ".js" theo đúng convention TypeScript ESM (trỏ tới file .js sau khi biên
// dịch; khi chạy trực tiếp bằng native type-stripping, Node tự resolve
// sang .ts/.mts cùng tên nếu .js chưa tồn tại).
import { chunkNormalizedDocument, ChunkingConfig, RawChunk } from './chunking.util.js';
import { computeChunkChecksum } from './normalization.util.js';
import { DocumentParser } from './models/normalized-document.model.js';
import { DocxParser } from './parsers/docx.parser.js';
import { HtmlParser } from './parsers/html.parser.js';
import { MarkdownParser } from './parsers/markdown.parser.js';
import { PdfParser } from './parsers/pdf.parser.js';
import { TextParser } from './parsers/text.parser.js';

export interface ParsingWorkerInput {
  fileBase64: string;
  fileName: string;
  config: ChunkingConfig;
}

export interface ParsingWorkerOutput {
  ok: true;
  chunks: RawChunk[];
  duplicatesSkipped: number;
  warnings: string[];
}

export interface ParsingWorkerError {
  ok: false;
  error: string;
}

function resolveParser(fileName: string): DocumentParser {
  const ext = extname(fileName).toLowerCase();
  const parsers: DocumentParser[] = [new PdfParser(), new DocxParser(), new TextParser(), new MarkdownParser(), new HtmlParser()];
  const parser = parsers.find((p) => p.extensions.includes(ext));
  if (!parser) throw new Error(`Không có parser cho định dạng "${ext}"`);
  return parser;
}

/** Loại bỏ chunk trùng checksum trong CÙNG 1 lần parse (yêu cầu Deduplication) */
function dedupeChunks(chunks: RawChunk[]): { unique: RawChunk[]; duplicatesSkipped: number } {
  const seen = new Set<string>();
  const unique: RawChunk[] = [];
  let duplicatesSkipped = 0;
  for (const chunk of chunks) {
    const checksum = computeChunkChecksum(chunk.content);
    if (seen.has(checksum)) {
      duplicatesSkipped++;
      continue;
    }
    seen.add(checksum);
    unique.push(chunk);
  }
  return { unique, duplicatesSkipped };
}

async function run(): Promise<void> {
  const { fileBase64, fileName, config } = workerData as ParsingWorkerInput;
  const warnings: string[] = [];
  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const parser = resolveParser(fileName);
    const normalized = await parser.parse(buffer, fileName);
    if (!normalized.plainText.trim()) {
      warnings.push('Tài liệu không trích xuất được nội dung văn bản nào (file rỗng hoặc chỉ chứa ảnh scan — cần OCR)');
    }
    const rawChunks = chunkNormalizedDocument(normalized, config);
    const { unique, duplicatesSkipped } = dedupeChunks(rawChunks);

    const output: ParsingWorkerOutput = { ok: true, chunks: unique, duplicatesSkipped, warnings };
    parentPort?.postMessage(output);
  } catch (error) {
    const output: ParsingWorkerError = { ok: false, error: (error as Error).message };
    parentPort?.postMessage(output);
  }
}

void run();
