/**
 * Worker thread thực thi Parse + Chunk cách ly khỏi main thread — cho phép
 * enforce giới hạn bộ nhớ THẬT (resourceLimits.maxOldGenerationSizeMb, set
 * ở nơi spawn worker trong WorkerPool) và không làm treo event loop chính
 * khi xử lý file lớn. KHÔNG dùng Nest DI ở đây (worker thread độc lập) —
 * các parser class không có dependency nào nên khởi tạo trực tiếp bằng
 * `new` vẫn đúng.
 *
 * SỐNG LÂU DÀI (persistent) — nhận nhiều message tuần tự qua parentPort
 * thay vì parse 1 lần rồi thoát. Lý do: đã xác nhận thật bằng thực nghiệm
 * — `pdf-parse` (pdfjs-dist) load lại nhiều lần trong các worker MỚI tạo
 * liên tiếp gây Access Violation cấp native dưới Jest (worker chạy 1 lần
 * rồi bị hủy ngay, native binding chưa kịp dọn dẹp sạch trước khi process
 * tiếp theo load lại) — dùng lại CÙNG 1 worker cho nhiều job (module chỉ
 * load 1 lần, ở lần message đầu) đã test ổn định qua 12 lần liên tiếp,
 * không crash.
 */
import { parentPort } from 'node:worker_threads';
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

/** Message gửi VÀO worker — requestId để khớp đúng response (worker xử lý tuần tự, nhưng vẫn khớp tường minh cho chắc chắn) */
export interface ParsingWorkerRequest {
  requestId: string;
  input: ParsingWorkerInput;
}

export type ParsingWorkerResponse = { requestId: string } & (ParsingWorkerOutput | ParsingWorkerError);

// Khởi tạo parser 1 LẦN DUY NHẤT khi worker khởi động (không phải mỗi request) —
// đúng tinh thần "persistent", tránh chi phí khởi tạo lại native binding mỗi job.
const parsers: DocumentParser[] = [new PdfParser(), new DocxParser(), new TextParser(), new MarkdownParser(), new HtmlParser()];

function resolveParser(fileName: string): DocumentParser {
  const ext = extname(fileName).toLowerCase();
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

async function handleOne(input: ParsingWorkerInput): Promise<ParsingWorkerOutput> {
  const warnings: string[] = [];
  const buffer = Buffer.from(input.fileBase64, 'base64');
  const parser = resolveParser(input.fileName);
  const normalized = await parser.parse(buffer, input.fileName);
  if (!normalized.plainText.trim()) {
    warnings.push('Tài liệu không trích xuất được nội dung văn bản nào (file rỗng hoặc chỉ chứa ảnh scan — cần OCR)');
  }
  const rawChunks = chunkNormalizedDocument(normalized, input.config);
  const { unique, duplicatesSkipped } = dedupeChunks(rawChunks);
  return { ok: true, chunks: unique, duplicatesSkipped, warnings };
}

parentPort?.on('message', (message: ParsingWorkerRequest) => {
  void handleOne(message.input)
    .then((output) => {
      const response: ParsingWorkerResponse = { requestId: message.requestId, ...output };
      parentPort?.postMessage(response);
    })
    .catch((error: Error) => {
      const response: ParsingWorkerResponse = { requestId: message.requestId, ok: false, error: error.message };
      parentPort?.postMessage(response);
    });
});
