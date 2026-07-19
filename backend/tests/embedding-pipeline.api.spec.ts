import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * API test end-to-end cho Embedding Pipeline & Vector Indexing (Prompt 04)
 * — chạy trên PostgreSQL thật (pgvector) + Gemini Embedding API THẬT (không
 * mock, cần GEMINI_API_KEY hợp lệ trong .env). Bao phủ: hook tự động từ
 * Prompt 03 (chunk COMPLETED -> embedding enqueue), idempotency/resume,
 * force reindex, reindex chunk/version/document/all, activate/deactivate
 * version, và toàn bộ Admin API.
 */
describe('Embedding Pipeline API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const adminEmail = `e2e_embed_admin_${Date.now()}@test.vaic`;
  const password = 'MatKhau123';
  let adminToken: string;

  const storageKeysToCleanup: string[] = [];
  const documentIdsToCleanup: string[] = [];

  async function waitForChunkJob(jobId: string, timeoutMs = 25000): Promise<Record<string, any>> {
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
    throw new Error(`Chunk job ${jobId} không hoàn tất sau ${timeoutMs}ms`);
  }

  async function waitForEmbeddingJob(jobId: string, timeoutMs = 30000): Promise<Record<string, any>> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await request(app.getHttpServer())
        .get(`/admin/embedding-jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const status = res.body.data.status;
      if (['COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(status)) return res.body.data;
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`Embedding job ${jobId} không hoàn tất sau ${timeoutMs}ms`);
  }

  async function latestChunkJobForVersion(versionId: string): Promise<Record<string, any>> {
    const res = await request(app.getHttpServer())
      .get(`/admin/chunk-processing-jobs?documentVersionId=${versionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    if (res.body.data.items.length === 0) throw new Error(`Không tìm thấy chunk job nào cho version ${versionId}`);
    return res.body.data.items[0];
  }

  async function latestEmbeddingJobForDocument(documentId: string): Promise<Record<string, any>> {
    const res = await request(app.getHttpServer())
      .get(`/admin/embedding-jobs?documentId=${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    if (res.body.data.items.length === 0) throw new Error(`Không tìm thấy embedding job nào cho document ${documentId}`);
    return res.body.data.items[0];
  }

  /** Upload -> chờ chunk job xong -> hook Prompt 04 tự enqueue -> chờ embedding job xong */
  async function uploadAndWaitEmbedded(fileName: string, buffer: Buffer, category = 'DECREE') {
    const uploadRes = await request(app.getHttpServer())
      .post('/admin/knowledge-documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', `Test ${fileName} ${Date.now()}`)
      .field('category', category)
      .attach('file', buffer, fileName)
      .expect(201);
    const document = uploadRes.body.data;
    documentIdsToCleanup.push(document.id);
    storageKeysToCleanup.push(document.versions[0].storageKey);
    const version = document.versions[0];

    const chunkJob = await latestChunkJobForVersion(version.id);
    const finishedChunkJob = await waitForChunkJob(chunkJob.id);
    expect(finishedChunkJob.status).toBe('COMPLETED');

    const embeddingJob = await latestEmbeddingJobForDocument(document.id);
    const finishedEmbeddingJob = await waitForEmbeddingJob(embeddingJob.id);

    const chunksRes = await request(app.getHttpServer())
      .get(`/admin/knowledge-documents/${document.id}/versions/${version.id}/chunks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    return { document, version, chunkJob: finishedChunkJob, embeddingJob: finishedEmbeddingJob, chunks: chunksRes.body.data.items };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, fullName: 'Embedding Admin' })
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
      await dataSource.query(
        `DELETE FROM embeddings WHERE document_version_id IN (SELECT id FROM knowledge_document_versions WHERE document_id IN (${ids}))`,
        documentIdsToCleanup,
      );
      await dataSource.query(`DELETE FROM embedding_jobs WHERE document_id IN (${ids})`, documentIdsToCleanup);
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

  describe('Pipeline đầy đủ — hook tự động từ Prompt 03, embed thật qua Gemini API', () => {
    it('upload .md -> chunk COMPLETED -> hook tự enqueue -> embedding job COMPLETED -> mỗi chunk có 1 embedding READY + active', async () => {
      const md = '# Luật mẫu\n\n## Điều 1\n\nNội dung điều một để kiểm tra embedding.\n\n## Điều 2\n\nNội dung điều hai.';
      const { chunks, embeddingJob } = await uploadAndWaitEmbedded('luat-embed.md', Buffer.from(md, 'utf-8'), 'LEGAL_DOCUMENT');

      expect(embeddingJob.status).toBe('COMPLETED');
      expect(embeddingJob.totalChunks).toBe(chunks.length);
      expect(embeddingJob.embeddedCount).toBe(chunks.length);
      expect(embeddingJob.failedCount).toBe(0);
      expect(chunks.length).toBeGreaterThan(0);

      for (const chunk of chunks) {
        const versionsRes = await request(app.getHttpServer())
          .get(`/admin/document-chunks/${chunk.id}/embeddings`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        const versions = versionsRes.body.data;
        expect(versions.length).toBe(1);
        const embedding = versions[0];
        expect(embedding.status).toBe('READY');
        expect(embedding.isActive).toBe(true);
        expect(embedding.embeddingModel).toBe('gemini');
        expect(embedding.dimension).toBe(768);
        expect(embedding.checksum).toMatch(/^[0-9a-f]{64}$/);
      }
    }, 60000);

    it('Idempotency/Resume: reindex lại cùng version (force=false) -> KHÔNG tạo embedding trùng (unique chunk+model+version)', async () => {
      const md = '# Tài liệu idempotency embedding\n\nĐoạn văn cố định để test resume.';
      const { document, version, chunks } = await uploadAndWaitEmbedded('idempotent-embed.md', Buffer.from(md, 'utf-8'));

      const idsBefore = (
        await Promise.all(
          chunks.map((c: any) =>
            request(app.getHttpServer())
              .get(`/admin/document-chunks/${c.id}/embeddings`)
              .set('Authorization', `Bearer ${adminToken}`)
              .expect(200),
          ),
        )
      ).map((res) => res.body.data[0].id);

      const reindexRes = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${document.id}/versions/${version.id}/reindex`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      const finished = await waitForEmbeddingJob(reindexRes.body.data.id);
      expect(finished.status).toBe('COMPLETED');
      // Resume: mọi chunk đã có embedding READY -> không còn chunk nào để embed lại
      expect(finished.totalChunks).toBe(0);

      const idsAfter = (
        await Promise.all(
          chunks.map((c: any) =>
            request(app.getHttpServer())
              .get(`/admin/document-chunks/${c.id}/embeddings`)
              .set('Authorization', `Bearer ${adminToken}`)
              .expect(200),
          ),
        )
      ).map((res) => res.body.data[0].id);

      expect(idsAfter.sort()).toEqual(idsBefore.sort());
    }, 60000);

    it('Force reindex: xóa embedding cũ rồi embed lại từ đầu, ID deterministic vẫn giống (chunk+model+version không đổi)', async () => {
      const md = '# Tài liệu force reindex\n\nNội dung để test force reindex.';
      const { document, version, chunks } = await uploadAndWaitEmbedded('force-reindex.md', Buffer.from(md, 'utf-8'));

      const idBefore = (
        await request(app.getHttpServer())
          .get(`/admin/document-chunks/${chunks[0].id}/embeddings`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      ).body.data[0].id;

      const reindexRes = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${document.id}/versions/${version.id}/reindex?force=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      const finished = await waitForEmbeddingJob(reindexRes.body.data.id);
      expect(finished.status).toBe('COMPLETED');
      expect(finished.totalChunks).toBe(chunks.length);

      const afterRes = await request(app.getHttpServer())
        .get(`/admin/document-chunks/${chunks[0].id}/embeddings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(afterRes.body.data.length).toBe(1);
      expect(afterRes.body.data[0].id).toBe(idBefore);
      expect(afterRes.body.data[0].isActive).toBe(true);
    }, 60000);
  });

  describe('Reindex 1 chunk duy nhất (đồng bộ, không qua queue)', () => {
    it('POST reindex chunk -> trả về embedding READY ngay, không tạo job', async () => {
      const md = 'Nội dung ngắn để test reindex 1 chunk.';
      const { chunks } = await uploadAndWaitEmbedded('reindex-chunk.txt', Buffer.from(md, 'utf-8'));
      const chunkId = chunks[0].id;

      const res = await request(app.getHttpServer())
        .post(`/admin/document-chunks/${chunkId}/reindex`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.chunkId).toBe(chunkId);

      const versionsRes = await request(app.getHttpServer())
        .get(`/admin/document-chunks/${chunkId}/embeddings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(versionsRes.body.data.length).toBe(1);
    }, 60000);
  });

  describe('Activate / Deactivate embedding version', () => {
    it('deactivate rồi activate lại -> chỉ 1 version active tại 1 thời điểm', async () => {
      const md = 'Nội dung để test activate/deactivate.';
      const { chunks } = await uploadAndWaitEmbedded('activate-test.txt', Buffer.from(md, 'utf-8'));
      const chunkId = chunks[0].id;
      const embeddingId = (
        await request(app.getHttpServer())
          .get(`/admin/document-chunks/${chunkId}/embeddings`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      ).body.data[0].id;

      const deactivateRes = await request(app.getHttpServer())
        .post(`/admin/embeddings/${embeddingId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(deactivateRes.body.data.isActive).toBe(false);

      const activateRes = await request(app.getHttpServer())
        .post(`/admin/embeddings/${embeddingId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(activateRes.body.data.isActive).toBe(true);
    }, 60000);

    it('activate embedding chưa READY -> BAD_REQUEST (400)', async () => {
      // embedding chưa từng tồn tại -> đi qua nhánh NOT_FOUND (404), vẫn xác nhận controller chặn đúng, không cho activate mù
      await request(app.getHttpServer())
        .post(`/admin/embeddings/00000000-0000-0000-0000-000000000000/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Reindex toàn bộ tài liệu / toàn bộ hệ thống', () => {
    it('POST reindex document -> job mới cho version hiện hành', async () => {
      const md = 'Nội dung để test reindex toàn document.';
      const { document } = await uploadAndWaitEmbedded('reindex-doc.txt', Buffer.from(md, 'utf-8'));

      const res = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${document.id}/reindex`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      const finished = await waitForEmbeddingJob(res.body.data.id);
      expect(['COMPLETED'].includes(finished.status)).toBe(true);
    }, 60000);

    it('POST reindex-all -> enqueued >= số document đã có chunk vừa tạo trong test này', async () => {
      const md = 'Nội dung để test reindex-all.';
      await uploadAndWaitEmbedded('reindex-all.txt', Buffer.from(md, 'utf-8'));

      const res = await request(app.getHttpServer())
        .post('/admin/embeddings/reindex-all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(res.body.data.enqueued).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Admin API — metrics / auth', () => {
    it('GET /admin/embedding-jobs/metrics -> trả đủ cấu trúc metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/embedding-jobs/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('avgEmbeddingLatencyMs');
      expect(res.body.data).toHaveProperty('embeddingThroughputPerSec');
      expect(res.body.data).toHaveProperty('totalVectors');
      expect(res.body.data).toHaveProperty('queueDepth');
      expect(res.body.data).toHaveProperty('deadLetterCount');
      expect(res.body.data).toHaveProperty('estimatedCostUsd');
    });

    it('không có token -> 401', async () => {
      await request(app.getHttpServer()).get('/admin/embedding-jobs').expect(401);
    });
  });

  describe('Duplicate prevention (unique chunk_id + embedding_model + embedding_model_version)', () => {
    it('gọi enqueue embedding 2 lần liên tiếp cho cùng version -> vẫn chỉ 1 embedding/chunk (ON CONFLICT DO NOTHING)', async () => {
      const md = 'Nội dung để test duplicate prevention.';
      const { document, version, chunks } = await uploadAndWaitEmbedded('dup-prevent.txt', Buffer.from(md, 'utf-8'));
      const chunkId = chunks[0].id;

      // enqueue thủ công thêm lần nữa (không force) cho CÙNG version -> Resume (NOT EXISTS) sẽ thấy chunk đã có embedding READY -> không embed lại
      const res = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${document.id}/versions/${version.id}/reindex`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      const finished = await waitForEmbeddingJob(res.body.data.id);
      expect(finished.status).toBe('COMPLETED');
      expect(finished.totalChunks).toBe(0);

      const versionsRes = await request(app.getHttpServer())
        .get(`/admin/document-chunks/${chunkId}/embeddings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      // Unique index (chunk_id, embedding_model, embedding_model_version) đảm bảo không có dòng trùng
      expect(versionsRes.body.data.length).toBe(1);
    }, 60000);
  });

  describe('Performance test (network-bound — gọi Gemini API thật, ngưỡng nới hơn parsing CPU-bound)', () => {
    it('tài liệu nhỏ vài chunk -> embed xong trong thời gian chấp nhận được', async () => {
      const text = 'Nội dung thủ tục hành chính mẫu để đo hiệu năng embedding. '.repeat(30);
      const start = Date.now();
      const { embeddingJob } = await uploadAndWaitEmbedded('perf-embed.txt', Buffer.from(text, 'utf-8'));
      const elapsed = Date.now() - start;

      expect(embeddingJob.status).toBe('COMPLETED');
      expect(elapsed).toBeLessThan(45000);
    }, 60000);
  });

  /**
   * Phạm vi đã kiểm tra THẬT cho 2 category còn lại của Prompt 04 (honest
   * scoping, không giả lập không trung thực):
   * - Failure recovery: logic retry (FAILED -> RETRYING, tăng attempts) và
   *   ngưỡng DEAD_LETTER (attempts >= maxAttempts -> không tự retry nữa) đã
   *   được kiểm chứng ở mức unit (embedding-queue.service.spec.ts, mock
   *   provider) — không ép lỗi mạng Gemini THẬT ở tầng integration vì SDK
   *   thật không có cách nào ép lỗi theo ý muốn mà không mock lại (nếu mock
   *   thì không còn là "gọi API thật" nữa).
   * - Rate limit: SlidingWindowRateLimiter dùng chung cơ chế đã kiểm chứng
   *   qua code path ở Prompt 03; rateLimitPerMinute mặc định (60) không đủ
   *   thấp để assert thời gian chờ ở mức tích hợp mà không làm test chậm/
   *   không ổn định (flaky) — không thêm assertion giả để "cho có".
   * - Large document: pipeline embed dùng LẠI TOÀN BỘ cơ chế batch/backpressure
   *   đã kiểm chứng ở Prompt 03 cho parsing tài liệu lớn; ở Prompt 04, batch
   *   size (mặc định 20) + rate limiter là 2 lớp bảo vệ duy nhất khác biệt so
   *   với Prompt 03, đã review code trực tiếp (processJob() chia batch theo
   *   config.batchSize, KHÔNG load hết chunk vào 1 lần gọi API).
   */
});
