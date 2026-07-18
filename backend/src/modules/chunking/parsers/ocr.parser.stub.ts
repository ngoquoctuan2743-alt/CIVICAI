import { Injectable } from '@nestjs/common';
import { DocumentParser, NormalizedDocument } from '../models/normalized-document.model';

/**
 * Placeholder cho OCR parser (ảnh scan/PDF không có text layer) — KHÔNG
 * triển khai thật ở Prompt 03 (ngoài phạm vi), chỉ giữ chỗ trong Registry để
 * kiến trúc sẵn sàng mở rộng. Giống hệt tinh thần `NotImplementedAdapter`
 * đã dùng cho LLM Adapter Pattern bên ai-service Python.
 *
 * Khi triển khai thật: có thể tái dùng `LlmClient.document_extract()`/
 * `vision_extract()` đã có sẵn ở ai-service (Claude/Gemini Vision) thay vì
 * thêm thư viện OCR riêng (Tesseract...).
 */
@Injectable()
export class OcrParserStub implements DocumentParser {
  readonly extensions: string[] = []; // chưa đăng ký đuôi file nào — chưa kích hoạt được qua Registry

  async parse(_buffer: Buffer, fileName: string): Promise<NormalizedDocument> {
    throw new Error(
      `OCR parser chưa được triển khai (Prompt 03 không bao gồm OCR thật). File "${fileName}" cần OCR ` +
        `phải đợi bước triển khai sau — dùng LlmClient.document_extract() ở ai-service làm nền tảng.`,
    );
  }
}
