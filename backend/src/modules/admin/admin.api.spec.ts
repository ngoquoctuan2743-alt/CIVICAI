import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';

/**
 * API test end-to-end cho Dashboard Admin (chạy trên PostgreSQL thật):
 * - Guard theo role: 401 (chưa đăng nhập), 403 (CITIZEN), 200 (ADMIN).
 * - CRUD admin: Procedures / Legal Documents / Government Agencies.
 *
 * Không có API tạo tài khoản ADMIN qua HTTP (register luôn gán CITIZEN) —
 * test tự gán role ADMIN thẳng vào DB bằng raw SQL rồi đăng nhập lại để
 * lấy access token mới (login nạp role tại thời điểm gọi).
 */
describe('Admin Dashboard API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const adminEmail = `e2e_admin_${Date.now()}@test.vaic`;
  const citizenEmail = `e2e_citizen_${Date.now()}@test.vaic`;
  const password = 'MatKhau123';
  let adminToken: string;
  let citizenToken: string;

  let createdProcedureId: string;
  let createdLegalId: string;
  let createdAgencyId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, fullName: 'Admin E2E' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: citizenEmail, password, fullName: 'Citizen E2E' })
      .expect(201);

    // Gán role ADMIN thẳng vào DB cho tài khoản admin test
    await dataSource.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u, roles r
       WHERE u.email = $1 AND r.code = 'ADMIN'`,
      [adminEmail],
    );

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    const citizenLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: citizenEmail, password })
      .expect(200);
    citizenToken = citizenLogin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    if (createdProcedureId) {
      await dataSource.query(`DELETE FROM administrative_procedures WHERE id = $1`, [createdProcedureId]);
    }
    if (createdLegalId) {
      await dataSource.query(`DELETE FROM legal_documents WHERE id = $1`, [createdLegalId]);
    }
    if (createdAgencyId) {
      await dataSource.query(`DELETE FROM government_agencies WHERE id = $1`, [createdAgencyId]);
    }
    await dataSource.query(`DELETE FROM users WHERE email IN ($1, $2)`, [adminEmail, citizenEmail]);
    await app.close();
  });

  describe('Guard theo role', () => {
    it('GET /admin/dashboard — không token bị 401', async () => {
      await request(app.getHttpServer()).get('/admin/dashboard').expect(401);
    });

    it('GET /admin/dashboard — CITIZEN bị 403', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
    });

    it('GET /admin/dashboard — ADMIN xem được, đúng cấu trúc số liệu', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.users.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.procedures).toHaveProperty('total');
      expect(res.body.data.agencies).toHaveProperty('total');
      expect(res.body.data.legalDocuments).toHaveProperty('total');
      expect(res.body.data.feedback).toHaveProperty('total');
    });
  });

  describe('CRUD Procedures (ADMIN)', () => {
    const code = `E2E-PROC-${Date.now()}`;

    it('POST /admin/procedures — CITIZEN bị 403', async () => {
      await request(app.getHttpServer())
        .post('/admin/procedures')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ code, name: 'Thủ tục test E2E' })
        .expect(403);
    });

    it('POST /admin/procedures — ADMIN tạo thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/procedures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code, name: 'Thủ tục test E2E' })
        .expect(201);

      expect(res.body.data.code).toBe(code);
      expect(res.body.data.status).toBe('ACTIVE');
      createdProcedureId = res.body.data.id;
    });

    it('GET /procedures/:id (công khai) — thấy thủ tục vừa tạo', async () => {
      const res = await request(app.getHttpServer())
        .get(`/procedures/${createdProcedureId}`)
        .expect(200);
      expect(res.body.data.code).toBe(code);
    });

    it('PATCH /admin/procedures/:id — cập nhật tên', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/procedures/${createdProcedureId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Thủ tục test E2E (đã sửa)' })
        .expect(200);
      expect(res.body.data.name).toBe('Thủ tục test E2E (đã sửa)');
    });

    it('DELETE /admin/procedures/:id — chuyển INACTIVE, biến mất khỏi tra cứu công khai', async () => {
      const del = await request(app.getHttpServer())
        .delete(`/admin/procedures/${createdProcedureId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(del.body.data.status).toBe('INACTIVE');

      const publicList = await request(app.getHttpServer())
        .get(`/procedures?search=${encodeURIComponent(code)}`)
        .expect(200);
      expect(publicList.body.data.items).toHaveLength(0);

      const adminList = await request(app.getHttpServer())
        .get(`/admin/procedures?search=${encodeURIComponent(code)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(adminList.body.data.items).toHaveLength(1);
    });
  });

  describe('CRUD Legal Documents (ADMIN)', () => {
    const code = `68/E2E/${Date.now()}`;

    it('POST /admin/legal/documents — ADMIN tạo thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/legal/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code,
          title: 'Văn bản test E2E',
          docType: 'LUAT',
          issuingBody: 'Quốc hội',
        })
        .expect(201);

      expect(res.body.data.status).toBe('CON_HIEU_LUC');
      createdLegalId = res.body.data.id;
    });

    it('DELETE /admin/legal/documents/:id — chuyển HET_HIEU_LUC', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/admin/legal/documents/${createdLegalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('HET_HIEU_LUC');
    });
  });

  describe('CRUD Government Agencies (ADMIN)', () => {
    const code = `E2E-AGENCY-${Date.now()}`;

    it('POST /admin/government/agencies — ADMIN tạo thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/government/agencies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code, name: 'Cơ quan test E2E', level: 'CENTRAL' })
        .expect(201);

      createdAgencyId = res.body.data.id;
    });

    it('DELETE /admin/government/agencies/:id — không bị tham chiếu, xóa thành công', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/government/agencies/${createdAgencyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const check = await dataSource.query(`SELECT id FROM government_agencies WHERE id = $1`, [
        createdAgencyId,
      ]);
      expect(check).toHaveLength(0);
      createdAgencyId = ''; // đã xóa, tránh cleanup lần hai ở afterAll
    });
  });
});
