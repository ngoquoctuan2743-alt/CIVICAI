import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * API test end-to-end cho Document Ingestion Pipeline (Prompt 02), chạy trên
 * PostgreSQL thật + ghi file thật vào ./uploads/knowledge-documents (dọn dẹp ở afterAll).
 */
describe('Knowledge Documents API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const citizenEmail = `e2e_kdoc_citizen_${Date.now()}@test.vaic`;
  const adminEmail = `e2e_kdoc_admin_${Date.now()}@test.vaic`;
  const password = 'MatKhau123';
  let citizenToken: string;
  let adminToken: string;

  const storageKeysToCleanup: string[] = [];
  let documentId: string;
  let versionOneId: string;
  let versionTwoId: string;

  const txtFile1 = Buffer.from('Nghị định về đăng ký cư trú - nội dung mẫu 1', 'utf-8');
  const txtFile2 = Buffer.from('Nghị định về đăng ký cư trú - nội dung mẫu 2 (bản sửa đổi)', 'utf-8');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const citizenReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: citizenEmail, password, fullName: 'KDoc Citizen' })
      .expect(201);
    citizenToken = citizenReg.body.data.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, fullName: 'KDoc Admin' })
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
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM knowledge_document_tags WHERE document_id IN (SELECT id FROM knowledge_documents WHERE created_by IN (SELECT id FROM users WHERE email = $1))`,
      [adminEmail],
    );
    await dataSource.query(
      `DELETE FROM knowledge_document_versions WHERE document_id IN (SELECT id FROM knowledge_documents WHERE created_by IN (SELECT id FROM users WHERE email = $1))`,
      [adminEmail],
    );
    await dataSource.query(`DELETE FROM knowledge_documents WHERE created_by IN (SELECT id FROM users WHERE email = $1)`, [
      adminEmail,
    ]);
    await dataSource.query(`DELETE FROM users WHERE email IN ($1, $2)`, [citizenEmail, adminEmail]);

    for (const key of storageKeysToCleanup) {
      const filePath = join(process.cwd(), 'uploads', key);
      if (existsSync(filePath)) unlinkSync(filePath);
    }

    await app.close();
  });

  describe('Upload', () => {
    it('CITIZEN bị 403', async () => {
      await request(app.getHttpServer())
        .post('/admin/knowledge-documents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', 'Không được phép')
        .field('category', 'DECREE')
        .attach('file', txtFile1, 'test1.txt')
        .expect(403);
    });

    it('file rỗng bị từ chối 400', async () => {
      await request(app.getHttpServer())
        .post('/admin/knowledge-documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'File rỗng')
        .field('category', 'DECREE')
        .attach('file', Buffer.alloc(0), 'empty.txt')
        .expect(400);
    });

    it('định dạng không hỗ trợ (.exe) bị từ chối 400', async () => {
      await request(app.getHttpServer())
        .post('/admin/knowledge-documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Định dạng sai')
        .field('category', 'DECREE')
        .attach('file', Buffer.from('MZ fake exe'), 'malware.exe')
        .expect(400);
    });

    it('ADMIN upload thành công -> tạo document + version 1, activeVersionId trỏ đúng version', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/knowledge-documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Nghị định đăng ký cư trú E2E')
        .field('category', 'DECREE')
        .field('source', 'Cổng thông tin Chính phủ')
        .field('tags', 'cu-tru,e2e-test')
        .attach('file', txtFile1, 'nghi-dinh-cu-tru.txt')
        .expect(201);

      const doc = res.body.data;
      expect(doc.title).toBe('Nghị định đăng ký cư trú E2E');
      expect(doc.category).toBe('DECREE');
      expect(doc.status).toBe('UPLOADED');
      expect(doc.versions).toHaveLength(1);
      expect(doc.activeVersionId).toBe(doc.versions[0].id);
      expect(doc.tags.map((t: { tagName: string }) => t.tagName).sort()).toEqual(['cu-tru', 'e2e-test']);

      documentId = doc.id;
      versionOneId = doc.versions[0].id;
      storageKeysToCleanup.push(doc.versions[0].storageKey);
    });

    it('upload lại đúng nội dung file (trùng hash) -> 409 CONFLICT', async () => {
      await request(app.getHttpServer())
        .post('/admin/knowledge-documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Bản trùng')
        .field('category', 'DECREE')
        .attach('file', txtFile1, 'trung-lap.txt')
        .expect(409);
    });
  });

  describe('List & Detail', () => {
    it('GET /admin/knowledge-documents?search= -> thấy tài liệu vừa tạo', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/knowledge-documents?search=cư trú E2E')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.items.some((d: { id: string }) => d.id === documentId)).toBe(true);
    });

    it('GET /admin/knowledge-documents?tag=cu-tru -> lọc đúng theo tag', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/knowledge-documents?tag=cu-tru')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.items.some((d: { id: string }) => d.id === documentId)).toBe(true);
    });

    it('GET /admin/knowledge-documents/:id -> chi tiết đủ version + tag', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(documentId);
      expect(res.body.data.versions).toHaveLength(1);
    });
  });

  describe('Versioning', () => {
    it('POST /:id/versions -> thêm version 2, KHÔNG tự kích hoạt', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${documentId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', txtFile2, 'nghi-dinh-cu-tru-v2.txt')
        .expect(201);

      versionTwoId = res.body.data.id;
      expect(res.body.data.versionNumber).toBe(2);
      storageKeysToCleanup.push(res.body.data.storageKey);

      const detail = await request(app.getHttpServer())
        .get(`/admin/knowledge-documents/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(detail.body.data.activeVersionId).toBe(versionOneId); // vẫn là version 1
      expect(detail.body.data.versions).toHaveLength(2);
    });

    it('POST /:id/versions/:versionId/activate -> kích hoạt version 2, status -> REINDEX_REQUIRED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${documentId}/versions/${versionTwoId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.data.activeVersionId).toBe(versionTwoId);
      expect(res.body.data.status).toBe('REINDEX_REQUIRED');
    });

    it('POST /:id/versions/:versionId/deactivate -> bỏ active, document không còn version hiện hành', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${documentId}/versions/${versionTwoId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.data.activeVersionId).toBeNull();
      expect(res.body.data.status).toBe('UPLOADED');
    });
  });

  describe('Delete & Restore', () => {
    it('DELETE /:id -> xóa mềm, biến mất khỏi danh sách mặc định', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/knowledge-documents/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get('/admin/knowledge-documents?search=cư trú E2E')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(list.body.data.items.some((d: { id: string }) => d.id === documentId)).toBe(false);

      const listWithDeleted = await request(app.getHttpServer())
        .get('/admin/knowledge-documents?search=cư trú E2E&includeDeleted=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(listWithDeleted.body.data.items.some((d: { id: string }) => d.id === documentId)).toBe(true);
    });

    it('POST /:id/restore -> khôi phục, xuất hiện lại trong danh sách mặc định', async () => {
      await request(app.getHttpServer())
        .post(`/admin/knowledge-documents/${documentId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/admin/knowledge-documents?search=cư trú E2E')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(list.body.data.items.some((d: { id: string }) => d.id === documentId)).toBe(true);
    });
  });
});
