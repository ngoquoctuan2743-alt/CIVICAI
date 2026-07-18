import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * API test end-to-end cho các luồng mới của PROMPT 18 (Backend API & Business
 * Logic), chạy trên PostgreSQL thật: Change/Forgot/Reset Password, Chat
 * Rename/Delete/Search, Admin Users, Admin Feedback/Audit Logs, Voice placeholder.
 */
describe('Prompt 18 API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const citizenEmail = `e2e_p18_citizen_${Date.now()}@test.vaic`;
  const adminEmail = `e2e_p18_admin_${Date.now()}@test.vaic`;
  const password = 'MatKhau123';
  let citizenToken: string;
  let adminToken: string;
  let citizenUserId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const citizenReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: citizenEmail, password, fullName: 'P18 Citizen' })
      .expect(201);
    citizenUserId = citizenReg.body.data.user.id;
    citizenToken = citizenReg.body.data.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, fullName: 'P18 Admin' })
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
    await dataSource.query(`DELETE FROM users WHERE email IN ($1, $2)`, [citizenEmail, adminEmail]);
    await app.close();
  });

  describe('Change Password', () => {
    it('PATCH /users/password — sai mật khẩu hiện tại bị 401', async () => {
      await request(app.getHttpServer())
        .patch('/users/password')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ currentPassword: 'SaiRoi123', newPassword: 'MatKhauMoi123' })
        .expect(401);
    });

    it('PATCH /users/password — đúng mật khẩu, đổi thành công, đăng nhập lại bằng mật khẩu mới', async () => {
      await request(app.getHttpServer())
        .patch('/users/password')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ currentPassword: password, newPassword: 'MatKhauMoi123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: citizenEmail, password: 'MatKhauMoi123' })
        .expect(200);
    });
  });

  describe('Forgot / Reset Password', () => {
    it('POST /auth/forgot-password — trả cùng thông điệp bất kể email tồn tại hay không', async () => {
      const existed = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: citizenEmail })
        .expect(200);
      const notExisted = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'khong-ton-tai@test.vaic' })
        .expect(200);

      expect(existed.body.data.message).toBe(notExisted.body.data.message);
      expect(existed.body.data.devToken).toBeDefined(); // môi trường test lộ devToken để tự kiểm thử
      expect(notExisted.body.data.devToken).toBeUndefined();
    });

    it('POST /auth/reset-password — token hợp lệ đặt lại được mật khẩu, dùng lại token cũ bị từ chối', async () => {
      const forgot = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: citizenEmail })
        .expect(200);
      const token = forgot.body.data.devToken;

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'MatKhauReset123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: citizenEmail, password: 'MatKhauReset123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'MatKhauKhac123' })
        .expect(400);
    });
  });

  describe('Chat — Rename/Delete/Search Conversation', () => {
    let freshToken: string;
    let conversationAId: string;

    beforeAll(async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: citizenEmail, password: 'MatKhauReset123' })
        .expect(200);
      freshToken = login.body.data.tokens.accessToken;

      const convA = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ title: 'Hỏi về căn cước công dân' })
        .expect(201);
      conversationAId = convA.body.data.id;

      await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ title: 'Hỏi về hộ chiếu' })
        .expect(201);
    });

    it('GET /conversations?search= — chỉ trả hội thoại khớp tiêu đề', async () => {
      const res = await request(app.getHttpServer())
        .get('/conversations?search=căn cước')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items.every((c: { title: string }) => c.title.includes('căn cước'))).toBe(true);
    });

    it('PATCH /conversations/:id — đổi tên hội thoại', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/conversations/${conversationAId}`)
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ title: 'Đã đổi tên' })
        .expect(200);
      expect(res.body.data.title).toBe('Đã đổi tên');
    });

    it('DELETE /conversations/:id — xóa hội thoại, biến mất khỏi danh sách', async () => {
      await request(app.getHttpServer())
        .delete(`/conversations/${conversationAId}`)
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/conversations?search=Đã đổi tên')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);
      expect(res.body.data.items).toHaveLength(0);
    });
  });

  describe('Admin — Users', () => {
    it('GET /admin/users — CITIZEN bị 403', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(403);
    });

    it('GET /admin/users — ADMIN xem được danh sách, search theo email', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users?search=${encodeURIComponent(citizenEmail)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].email).toBe(citizenEmail);
    });

    it('PATCH /admin/users/:id/status — khóa tài khoản, tài khoản bị khóa không login được nữa', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${citizenUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'BANNED' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: citizenEmail, password: 'MatKhauReset123' })
        .expect(403);

      // Mở lại để không ảnh hưởng cleanup ở afterAll (soft-delete-safe)
      await request(app.getHttpServer())
        .patch(`/admin/users/${citizenUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);
    });
  });

  describe('Admin — Feedback & Audit Logs', () => {
    it('GET /admin/feedback/stats — trả đúng cấu trúc số liệu', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/feedback/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('positive');
      expect(res.body.data).toHaveProperty('negative');
    });

    it('GET /admin/audit-logs — ghi nhận được sự kiện LOGIN vừa xảy ra', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/audit-logs?action=LOGIN&actorUserId=${citizenUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].action).toBe('LOGIN');
    });
  });

  describe('Voice placeholder', () => {
    it('POST /voice/stt — echo transcript kèm cảnh báo placeholder', async () => {
      const res = await request(app.getHttpServer())
        .post('/voice/stt')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ transcript: 'Xin chào' })
        .expect(201);
      expect(res.body.data.transcript).toBe('Xin chào');
      expect(res.body.data.message).toContain('PLACEHOLDER');
    });

    it('POST /voice/tts — trả audioUrl null kèm cảnh báo placeholder', async () => {
      const res = await request(app.getHttpServer())
        .post('/voice/tts')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ text: 'Xin chào bạn' })
        .expect(201);
      expect(res.body.data.audioUrl).toBeNull();
      expect(res.body.data.message).toContain('PLACEHOLDER');
    });
  });
});
