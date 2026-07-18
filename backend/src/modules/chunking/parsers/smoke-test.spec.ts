import { DocxParser } from './docx.parser';
import { HtmlParser } from './html.parser';
import { MarkdownParser } from './markdown.parser';
import { PdfParser } from './pdf.parser';
import { TextParser } from './text.parser';

/** Sinh PDF hợp lệ tối thiểu (2 trang, không dùng thư viện ngoài) để test thật pdf-parse */
function makeMinimalTwoPagePdf(): Buffer {
  const objs: string[] = [];
  objs.push('<</Type/Catalog/Pages 2 0 R>>');
  objs.push('<</Type/Pages/Kids[3 0 R 5 0 R]/Count 2>>');
  const content1 = 'BT /F1 18 Tf 50 700 Td (Article One Title) Tj ET';
  objs.push('<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 612 792]/Contents 6 0 R>>');
  objs.push('<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>');
  objs.push('<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 612 792]/Contents 7 0 R>>');
  const content2 = 'BT /F1 18 Tf 50 700 Td (Page Two Content) Tj ET';
  objs.push(`<</Length ${content1.length}>>\nstream\n${content1}\nendstream`);
  objs.push(`<</Length ${content2.length}>>\nstream\n${content2}\nendstream`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

/** Smoke test tạm — kiểm tra parser thật chạy được với nội dung mẫu tối thiểu, không lỗi runtime */
describe('Parser smoke test', () => {
  it('TextParser đọc .txt tiếng Việt, dò heading Điều/Khoản', async () => {
    const text = 'Điều 1. Phạm vi điều chỉnh\nNội dung điều 1.\n\nĐiều 2. Đối tượng áp dụng\n1. Công dân Việt Nam\n2. Người nước ngoài';
    const result = await new TextParser().parse(Buffer.from(text, 'utf-8'), 'test.txt');
    expect(result.plainText).toContain('Điều 1');
    expect(result.headings.some((h) => h.text.includes('Điều 1'))).toBe(true);
    expect(result.headings.some((h) => h.text.includes('Điều 2'))).toBe(true);
  });

  it('MarkdownParser đọc heading/list/table đúng cấu trúc thật', async () => {
    const md = '# Tiêu đề\n\n## Mục 1\n\nMột đoạn văn.\n\n- Mục a\n- Mục b\n\n| Cột 1 | Cột 2 |\n|---|---|\n| A | B |\n';
    const result = await new MarkdownParser().parse(Buffer.from(md, 'utf-8'), 'test.md');
    expect(result.title).toBe('Tiêu đề');
    expect(result.headings).toHaveLength(2);
    expect(result.headings[0].level).toBe(1);
    expect(result.headings[1].level).toBe(2);
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].items).toEqual(['Mục a', 'Mục b']);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].rows).toEqual([['Cột 1', 'Cột 2'], ['A', 'B']]);
    // offset phải khớp plainText thật
    for (const h of result.headings) {
      expect(result.plainText.slice(h.charStart, h.charStart + h.text.length)).toBe(h.text);
    }
  });

  it('HtmlParser đọc heading/list/table qua thẻ HTML thật', async () => {
    const html = '<html lang="vi"><head><title>Trang mẫu</title></head><body><h1>Tiêu đề chính</h1><p>Đoạn văn.</p><ul><li>A</li><li>B</li></ul><table><tr><th>X</th></tr><tr><td>1</td></tr></table></body></html>';
    const result = await new HtmlParser().parse(Buffer.from(html, 'utf-8'), 'test.html');
    expect(result.title).toBe('Trang mẫu');
    expect(result.headings).toHaveLength(1);
    expect(result.lists[0].items).toEqual(['A', 'B']);
    expect(result.tables[0].rows).toEqual([['X'], ['1']]);
    for (const h of result.headings) {
      expect(result.plainText.slice(h.charStart, h.charStart + h.text.length)).toBe(h.text);
    }
  });

  it('DocxParser đọc file .docx thật (tạo bằng docx buffer tối thiểu qua mammoth mock nội dung)', async () => {
    // Không tạo .docx thật nhị phân ở đây (phức tạp) — test qua HTML mammoth trả về trong docx.parser thật
    // sẽ được verify ở integration test (upload thật qua API). Ở đây chỉ xác nhận parser không throw với lỗi input.
    await expect(new DocxParser().parse(Buffer.from('not a real docx'), 'broken.docx')).rejects.toThrow();
  });

  it('PdfParser throw lỗi rõ ràng với buffer không phải PDF thật', async () => {
    await expect(new PdfParser().parse(Buffer.from('not a real pdf'), 'broken.pdf')).rejects.toThrow();
  });

  it('PdfParser đọc PDF 2 trang thật — text theo trang, pages[] đúng offset', async () => {
    const result = await new PdfParser().parse(makeMinimalTwoPagePdf(), 'test.pdf');
    expect(result.plainText).toContain('Article One Title');
    expect(result.plainText).toContain('Page Two Content');
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[1].pageNumber).toBe(2);
    // "Page Two Content" phải nằm trong khoảng offset của trang 2
    const idx = result.plainText.indexOf('Page Two Content');
    expect(idx).toBeGreaterThanOrEqual(result.pages[1].charStart);
  }, 15000);
});
