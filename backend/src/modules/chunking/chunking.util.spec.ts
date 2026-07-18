import { computeChunkChecksum } from './normalization.util';
import { chunkNormalizedDocument, DEFAULT_CHUNKING_CONFIG } from './chunking.util';
import { deterministicChunkId } from './chunk-id.util';
import { NormalizedDocument } from './models/normalized-document.model';

function baseDoc(overrides: Partial<NormalizedDocument>): NormalizedDocument {
  return {
    title: null,
    plainText: '',
    headings: [],
    tables: [],
    lists: [],
    pages: [{ pageNumber: 1, charStart: 0, charEnd: 0 }],
    sourceFileName: 'test.txt',
    language: 'vi',
    ...overrides,
  };
}

describe('chunkNormalizedDocument', () => {
  it('legal-article-aware: mỗi Điều là 1 chunk riêng, không gộp/cắt giữa 2 Điều', () => {
    const dieu1 = 'Điều 1. Nội dung điều một ngắn gọn.';
    const dieu2 = 'Điều 2. Nội dung điều hai cũng ngắn gọn.';
    const text = `${dieu1}\n\n${dieu2}`;
    const doc = baseDoc({
      plainText: text,
      headings: [
        { level: 2, text: dieu1, charStart: 0, pageNumber: 1 },
        { level: 2, text: dieu2, charStart: text.indexOf(dieu2), pageNumber: 1 },
      ],
      pages: [{ pageNumber: 1, charStart: 0, charEnd: text.length }],
    });

    const chunks = chunkNormalizedDocument(doc, DEFAULT_CHUNKING_CONFIG);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toContain('Điều 1');
    expect(chunks[0].content).not.toContain('Điều 2');
    expect(chunks[1].content).toContain('Điều 2');
    expect(chunks[0].sectionTitle).toContain('Điều 1');
  });

  it('heading-aware: chia theo heading khi KHÔNG phải văn bản luật', () => {
    const text = 'Giới thiệu chung.\n\nHướng dẫn chi tiết các bước thực hiện.';
    const doc = baseDoc({
      plainText: text,
      headings: [
        { level: 1, text: 'Giới thiệu', charStart: 0, pageNumber: null },
        { level: 1, text: 'Hướng dẫn', charStart: 19, pageNumber: null },
      ],
      pages: [{ pageNumber: 1, charStart: 0, charEnd: text.length }],
    });

    const chunks = chunkNormalizedDocument(doc, DEFAULT_CHUNKING_CONFIG);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].headingPath).toEqual(['Giới thiệu']);
    expect(chunks[1].headingPath).toEqual(['Hướng dẫn']);
  });

  it('paragraph-aware: không có heading nào -> chia theo đoạn văn', () => {
    const text = 'Đoạn một.\n\nĐoạn hai.\n\nĐoạn ba.';
    const doc = baseDoc({ plainText: text, pages: [{ pageNumber: 1, charStart: 0, charEnd: text.length }] });

    const chunks = chunkNormalizedDocument(doc, DEFAULT_CHUNKING_CONFIG);
    expect(chunks.map((c) => c.content)).toEqual(['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.']);
  });

  it('đơn vị quá lớn (> maxChunkSize) bị sub-split có overlap', () => {
    const sentence = 'Đây là một câu ví dụ để kiểm tra chunking. ';
    const text = sentence.repeat(80); // ~3500 ký tự, vượt maxChunkSize=1500 mặc định
    const doc = baseDoc({ plainText: text, pages: [{ pageNumber: 1, charStart: 0, charEnd: text.length }] });

    const chunks = chunkNormalizedDocument(doc, DEFAULT_CHUNKING_CONFIG);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(DEFAULT_CHUNKING_CONFIG.maxChunkSize);
    }
    // Có overlap: cuối chunk[0] và đầu chunk[1] phải trùng 1 đoạn văn bản
    const overlapCandidate = chunks[0].content.slice(-50);
    expect(chunks[1].content.includes(overlapCandidate.split(' ').slice(-3).join(' '))).toBe(true);
  });

  it('KHÔNG cắt giữa 1 list khi sub-split đơn vị quá lớn', () => {
    const filler = 'Nội dung mở đầu cần chunking dài. '.repeat(40); // đủ dài để vượt target
    const listBlock = '1. Mục một\n2. Mục hai\n3. Mục ba cần giữ nguyên không được cắt giữa chừng';
    const text = filler + listBlock;
    const listCharStart = filler.length;
    const doc = baseDoc({
      plainText: text,
      lists: [{ ordered: true, items: ['Mục một', 'Mục hai', 'Mục ba cần giữ nguyên không được cắt giữa chừng'], charStart: listCharStart, charEnd: text.length }],
      pages: [{ pageNumber: 1, charStart: 0, charEnd: text.length }],
    });

    const chunks = chunkNormalizedDocument(doc, DEFAULT_CHUNKING_CONFIG);
    // Toàn bộ list phải nằm trọn trong 1 chunk duy nhất (không bị xé giữa 2 chunk)
    const chunkContainingListStart = chunks.find((c) => c.charStart <= listCharStart && c.charEnd > listCharStart);
    expect(chunkContainingListStart).toBeDefined();
    expect(chunkContainingListStart!.charEnd).toBeGreaterThanOrEqual(text.length);
  });

  it('tài liệu rỗng -> không sinh chunk nào', () => {
    const chunks = chunkNormalizedDocument(baseDoc({ plainText: '   ' }), DEFAULT_CHUNKING_CONFIG);
    expect(chunks).toHaveLength(0);
  });
});

describe('computeChunkChecksum (dedup)', () => {
  it('2 chunk nội dung giống hệt (kể cả khoảng trắng đầu dòng khác nhau) -> checksum giống nhau', () => {
    const a = computeChunkChecksum('Điều 1. Nội dung.\nDòng hai.');
    const b = computeChunkChecksum('  Điều 1. Nội dung.\n  Dòng hai.  ');
    expect(a).toBe(b);
  });

  it('2 chunk nội dung khác nhau -> checksum khác nhau', () => {
    const a = computeChunkChecksum('Điều 1.');
    const b = computeChunkChecksum('Điều 2.');
    expect(a).not.toBe(b);
  });
});

describe('deterministicChunkId (idempotency)', () => {
  it('cùng versionId + chunkIndex -> luôn ra cùng 1 ID', () => {
    const id1 = deterministicChunkId('11111111-1111-1111-1111-111111111111', 0);
    const id2 = deterministicChunkId('11111111-1111-1111-1111-111111111111', 0);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('chunkIndex khác nhau -> ID khác nhau', () => {
    const id1 = deterministicChunkId('11111111-1111-1111-1111-111111111111', 0);
    const id2 = deterministicChunkId('11111111-1111-1111-1111-111111111111', 1);
    expect(id1).not.toBe(id2);
  });

  it('versionId khác nhau -> ID khác nhau dù cùng chunkIndex', () => {
    const id1 = deterministicChunkId('11111111-1111-1111-1111-111111111111', 0);
    const id2 = deterministicChunkId('22222222-2222-2222-2222-222222222222', 0);
    expect(id1).not.toBe(id2);
  });
});
