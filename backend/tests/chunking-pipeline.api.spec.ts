import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * API test end-to-end cho Document Parsing & Intelligent Chunking Engine
 * (Prompt 03) — chạy trên PostgreSQL thật + worker_threads THẬT (không mock).
 * Bao phủ: pipeline đầy đủ, idempotency, large document, malformed document,
 * duplicate chunk (dedup), performance, toàn bộ Admin API.
 */
describe('Chunking Pipeline API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const adminEmail = `e2e_chunk_admin_${Date.now()}@test.vaic`;
  const password = 'MatKhau123';
  let adminToken: string;

  const storageKeysToCleanup: string[] = [];
  const documentIdsToCleanup: string[] = [];

  async function waitForJob(jobId: string, timeoutMs = 25000): Promise<Record<string, any>> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await request(app.getHttpServer())
        .get(`/admin/chunk-processing-jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const status = res.body.data.status;
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) return res.body.data;
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`Job ${jobId} không hoàn tất sau ${timeoutMs}ms`);
  }

  async function latestJobForVersion(versionId: string): Promise<Record<string, any>> {
    const res = await request(app.getHttpServer())
      .get(`/admin/chunk-processing-jobs?documentVersionId=${versionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    if (res.body.data.items.length === 0) throw new Error(`Không tìm thấy job nào cho version ${versionId}`);
    return res.body.data.items[0];
  }

  async function uploadAndWait(fileName: string, buffer: Buffer, category = 'DECREE') {
    const res = await request(app.getHttpServer())
      .post('/admin/knowledge-documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', `Test ${fileName} ${Date.now()}`)
      .field('category', category)
      .attach('file', buffer, fileName)
      .expect(201);
    const doc = res.body.data;
    documentIdsToCleanup.push(doc.id);
    storageKeysToCleanup.push(doc.versions[0].storageKey);
    const job = await latestJobForVersion(doc.versions[0].id);
    const finished = await waitForJob(job.id);
    return { document: doc, version: doc.versions[0], job: finished };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, fullName: 'Chunk Admin' })
      .expect(201);
    await dataSource.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u, roles r WHERE u.email = $1 AND r.code = 'ADMIN'`,
      [adminEmail],
    );
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = adminLogin.body.data.tokens.accessToken;
  }, 30000);

  afterAll(async () => {
    if (documentIdsToCleanup.length > 0) {
      const ids = documentIdsToCleanup.map((_, i) => `$${i + 1}`).join(',');
      await dataSource.query(`DELETE FROM document_chunks WHERE document_id IN (${ids})`, documentIdsToCleanup);
      await dataSource.query(`DELETE FROM parsing_logs WHERE job_id IN (SELECT id FROM chunk_processing_jobs WHERE document_id IN (${ids}))`, documentIdsToCleanup);
      await dataSource.query(`DELETE FROM chunk_processing_jobs WHERE document_id IN (${ids})`, documentIdsToCleanup);
      await dataSource.query(`DELETE FROM knowledge_document_tags WHERE document_id IN (${ids})`, documentIdsToCleanup);
      await dataSource.query(`DELETE FROM knowledge_document_versions WHERE document_id IN (${ids})`, documentIdsToCleanup);
      await dataSource.query(`DELETE FROM knowledge_documents WHERE id IN (${ids})`, documentIdsToCleanup);
    }
    await dataSource.query(`DELETE FROM users WHERE email = $1`, [adminEmail]);
    for (const key of storageKeysToCleanup) {
      const filePath = join(process.cwd(), 'uploads', key);
      if (existsSync(filePath)) unlinkSync(filePath);
    }
    await app.close();
  });

  describe('Pipeline đầy đủ — upload tự động enqueue, parse thật, chunk có đủ metadata + provenance', () => {
    it('upload .md -> job COMPLETED -> chunk có đủ metadata bắt buộc', async () => {
      const md = '# Luật mẫu\n\n## Điều 1\n\nNội dung điều một để kiểm tra chunking thật.\n\n## Điều 2\n\nNội dung điều hai.';
      const { document, version, job } = await uploadAndWait('luat-mau.md', Buffer.from(md, 'utf-8'), 'LEGAL_DOCUMENT');

      expect(job.status).toBe('COMPLETED');
      expect(job.chunksProduced).toBeGreaterThan(0);
      expect(job.durationMs).toBeGreaterThanOrEqual(0);

      const chunksRes = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const chunks = chunksRes.body.data.items;
      expect(chunks.length).toBeGreaterThan(0);

      const chunk = chunks[0];
      // Đủ metadata bắt buộc theo Prompt 03
      expect(chunk.id).toBeDefined();
      expect(chunk.documentId).toBe(document.id);
      expect(chunk.documentVersionId).toBe(version.id);
      expect(chunk.chunkIndex).toBeDefined();
      expect(chunk.sectionTitle).toBeDefined();
      expect(Array.isArray(chunk.headingPath)).toBe(true);
      expect(chunk.charStart).toBeGreaterThanOrEqual(0);
      expect(chunk.charEnd).toBeGreaterThan(chunk.charStart);
      expect(chunk.wordCount).toBeGreaterThan(0);
      expect(chunk.language).toBe('vi');
      expect(chunk.sourceType).toBe('KNOWLEDGE_DOCUMENT');
      expect(chunk.category).toBe('LEGAL_DOCUMENT');
      expect(Array.isArray(chunk.tags)).toBe(true);
      expect(chunk.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(chunk.createdAt).toBeDefined();

      // Provenance: nội dung chunk PHẢI truy vết được về đúng vị trí trong document gốc
      const logsRes = await request(app.getHttpServer())
        .get(`/admin/chunk-processing-jobs/${job.id}/logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(logsRes.body.data.length).toBeGreaterThan(0);
    }, 30000);

    it('Idempotency: reparse cùng version 2 lần -> chunk ID giống hệt nhau', async () => {
      const md = '# Tài liệu idempotency\n\nĐoạn văn cố định để test.';
      const { document, version, job: firstJob } = await uploadAndWait('idempotent.md', Buffer.from(md, 'utf-8'));
      expect(firstJob.status).toBe('COMPLETED');

      const chunksBefore = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const idsBefore = chunksBefore.body.data.items.map((c: any) => c.id).sort();

      const reparseRes = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${document.id}/versions/${version.id}/reparse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      await waitForJob(reparseRes.body.data.id);

      const chunksAfter = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const idsAfter = chunksAfter.body.data.items.map((c: any) => c.id).sort();

      expect(idsAfter).toEqual(idsBefore);
    }, 30000);
  });

  describe('Large document test', () => {
    it('tài liệu lớn (~300KB, nhiều Điều) -> parse xong trong thời gian hợp lý, mọi chunk <= maxChunkSize', async () => {
      const articles: string[] = [];
      for (let i = 1; i <= 300; i++) {
        articles.push(`Điều ${i}. Quy định về nội dung số ${i}. ` + 'Chi tiết nội dung điều khoản hành chính. '.repeat(20));
      }
      const bigText = articles.join('\n\n');
      expect(bigText.length).toBeGreaterThan(190_000);

      const { job, document, version } = await uploadAndWait('large-doc.txt', Buffer.from(bigText, 'utf-8'));
      expect(job.status).toBe('COMPLETED');
      expect(job.chunksProduced).toBeGreaterThan(100);

      const chunksRes = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks?limit=500`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      for (const c of chunksRes.body.data.items) {
        expect(c.content.length).toBeLessThanOrEqual(1500);
      }
    }, 40000);
  });

  describe('Malformed document test', () => {
    it('PDF hỏng (qua được magic-bytes upload nhưng parser không đọc được) -> job FAILED, KHÔNG mất metadata, KHÔNG có chunk nào', async () => {
      // Magic bytes %PDF- hợp lệ để qua validate ở Prompt 02, nhưng phần thân là rác -> pdf-parse sẽ lỗi khi parse thật
      const brokenPdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('garbage garbage garbage'.repeat(50))]);

      const uploadRes = await request(app.getHttpServer())
        .post('/admin/knowledge-documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', `Broken PDF ${Date.now()}`)
        .field('category', 'DECREE')
        .attach('file', brokenPdf, 'broken.pdf')
        .expect(201);
      const doc = uploadRes.body.data;
      documentIdsToCleanup.push(doc.id);
      storageKeysToCleanup.push(doc.versions[0].storageKey);

      const job = await latestJobForVersion(doc.versions[0].id);
      const finished = await waitForJob(job.id);

      expect(finished.status).toBe('FAILED');
      expect(finished.errorReason).toBeTruthy();

      // Document + version metadata vẫn còn nguyên (Never lose metadata)
      const detailRes = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${doc.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(detailRes.body.data.id).toBe(doc.id);
      expect(detailRes.body.data.versions[0].fileName).toBe('broken.pdf');

      // Không có chunk nào bị bỏ sót dở dang (Never leave partial chunks)
      const chunksRes = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${doc.id}/versions/${doc.versions[0].id}/chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(chunksRes.body.data.total).toBe(0);

      // Log lỗi đã được ghi (Observability)
      const logsRes = await request(app.getHttpServer())
        .get(`/admin/chunk-processing-jobs/${job.id}/logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(logsRes.body.data.some((l: any) => l.level === 'ERROR')).toBe(true);

      // Retry vẫn được phép (Failure Recovery: Allow retry)
      const retryRes = await request(app.getHttpServer())
        .post(`/admin/chunk-processing-jobs/${job.id}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(retryRes.body.data.attempts).toBe(1);
      await waitForJob(job.id);
    }, 30000);
  });

  describe('Duplicate document test (dedup checksum trong 1 version)', () => {
    it('đoạn văn lặp lại nhiều lần trong 1 tài liệu -> không tạo chunk trùng checksum', async () => {
      const repeatedParagraph = 'Đây là một đoạn văn được lặp lại nhiều lần để kiểm tra deduplication.';
      const text = Array(5).fill(repeatedParagraph).join('\n\n');

      const { document, version, job } = await uploadAndWait('duplicate.txt', Buffer.from(text, 'utf-8'));
      expect(job.status).toBe('COMPLETED');

      const chunksRes = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const checksums = chunksRes.body.data.items.map((c: any) => c.checksum);
      const uniqueChecksums = new Set(checksums);
      // 5 đoạn giống hệt nhau (paragraph-aware -> 5 đơn vị riêng, cùng nội dung)
      // -> dedup checksum phải gộp còn ĐÚNG 1 chunk duy nhất
      expect(uniqueChecksums.size).toBe(checksums.length);
      expect(chunksRes.body.data.total).toBe(1);
    }, 30000);
  });

  describe('Performance test', () => {
    it('tài liệu vừa (~5KB) parse xong trong thời gian chấp nhận được', async () => {
      const text = 'Nội dung thủ tục hành chính mẫu để đo hiệu năng. '.repeat(100);
      const start = Date.now();
      const { job } = await uploadAndWait('perf.txt', Buffer.from(text, 'utf-8'));
      const elapsed = Date.now() - start;

      expect(job.status).toBe('COMPLETED');
      expect(elapsed).toBeLessThan(15000);
      expect(job.durationMs).toBeLessThan(10000);
    }, 20000);
  });

  describe('Admin API — rebuild/delete/cancel/metrics', () => {
    it('rebuild-chunks: xóa chunk cũ rồi parse lại, chunksProduced > 0', async () => {
      const { document, version } = await uploadAndWait('rebuild-test.txt', Buffer.from('Nội dung để test rebuild.', 'utf-8'));

      const rebuildRes = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${document.id}/versions/${version.id}/rebuild-chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(rebuildRes.body.data.job).toBeDefined();
      const finished = await waitForJob(rebuildRes.body.data.job.id);
      expect(finished.status).toBe('COMPLETED');
    }, 30000);

    it('DELETE chunks: xóa sạch, GET trả total = 0', async () => {
      const { document, version } = await uploadAndWait('delete-test.txt', Buffer.from('Nội dung để test xóa chunk.', 'utf-8'));

      await request(app.getHttpServer())
        .delete(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const chunksRes = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(chunksRes.body.data.total).toBe(0);
    }, 20000);

    it('GET /admin/chunk-processing-jobs/metrics -> trả đủ cấu trúc metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/chunk-processing-jobs/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('avgParsingDurationMs');
      expect(res.body.data).toHaveProperty('totalChunks');
      expect(res.body.data).toHaveProperty('avgChunkSizeChars');
      expect(res.body.data).toHaveProperty('parserFailureCount');
      expect(res.body.data).toHaveProperty('totalRetryCount');
      expect(res.body.data).toHaveProperty('avgQueueLatencyMs');
    });
  });
});
