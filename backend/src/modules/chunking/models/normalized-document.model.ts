/**
 * Mô hình tài liệu chuẩn hóa — MỌI parser (PDF/DOCX/TXT/MD/HTML/OCR tương lai)
 * phải trả về đúng shape này, bất kể định dạng gốc. Chunking Engine chỉ làm
 * việc với model này, không biết gì về định dạng file gốc (Adapter Pattern —
 * cùng tinh thần với LlmClient interface bên ai-service Python).
 */

/** Một tiêu đề trong hệ thống phân cấp heading của tài liệu */
export interface NormalizedHeading {
  /** Cấp độ heading: 1 = tiêu đề lớn nhất (H1/Điều/Chương), số càng lớn càng chi tiết */
  level: number;
  text: string;
  /** Vị trí ký tự bắt đầu của heading trong `plainText` */
  charStart: number;
  /** Trang chứa heading (PDF) — null nếu định dạng không có khái niệm trang */
  pageNumber: number | null;
}

/** Bảng trích xuất được (best-effort — không đảm bảo đúng 100% với PDF phức tạp) */
export interface NormalizedTable {
  pageNumber: number | null;
  charStart: number;
  rows: string[][];
}

/** Danh sách (bullet/numbered) trích xuất được */
export interface NormalizedList {
  ordered: boolean;
  items: string[];
  charStart: number;
  charEnd: number;
}

/** Text của 1 trang — chỉ có ý nghĩa với định dạng phân trang thật (PDF) */
export interface NormalizedPage {
  pageNumber: number;
  charStart: number;
  charEnd: number;
}

/** Kết quả chuẩn hóa của MỘT document parser — input cho Chunking Engine */
export interface NormalizedDocument {
  title: string | null;
  /** Toàn văn đã chuẩn hóa (unicode NFC, whitespace, ký tự vô hình đã xử lý) */
  plainText: string;
  headings: NormalizedHeading[];
  tables: NormalizedTable[];
  lists: NormalizedList[];
  pages: NormalizedPage[];
  sourceFileName: string;
  /** Ngôn ngữ phát hiện được (best-effort) hoặc kế thừa từ metadata document cha */
  language: string;
}

/** Interface Adapter cho từng loại parser — 1 class/module implement cho mỗi định dạng */
export interface DocumentParser {
  /** Danh sách đuôi file parser này xử lý được, vd ['.pdf'] */
  readonly extensions: string[];
  parse(buffer: Buffer, fileName: string): Promise<NormalizedDocument>;
}
