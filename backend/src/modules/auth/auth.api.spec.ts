import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';

/**
 * API test end-to-end: Register -> Login -> Profile (chạy trên PostgreSQL thật).
 * Yêu cầu: container postgres đang chạy + migration đã áp dụng (kèm seed roles).
 */
describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Email duy nhất mỗi lần chạy để test lặp lại được
  const email = `e2e_${Date.now()}@test.vaic`;
  const password = 'MatKhau123';
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // Dọn dữ liệu test (hard delete — bảng nối/token xóa theo CASCADE)
    await dataSource.query(`DELETE FROM users WHERE email = $1`, [email]);
    await app.close();
  });

  it('POST /auth/register — tạo tài khoản, trả user + cặp token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, fullName: 'Người Dùng E2E' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.roles).toContain('CITIZEN');
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });

  it('POST /auth/register — email trùng bị từ chối 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, fullName: 'Trùng Email' })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /auth/login — đăng nhập đúng, nhận token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.data.tokens.accessToken).toBeDefined();
    accessToken = res.body.data.tokens.accessToken;
  });

  it('POST /auth/login — sai mật khẩu bị 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'SaiMatKhau1' })
      .expect(401);
  });

  it('GET /users/profile — không token bị 401 (secure by default)', async () => {
    await request(app.getHttpServer()).get('/users/profile').expect(401);
  });

  it('GET /users/profile — có token trả đúng hồ sơ', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.email).toBe(email);
    expect(res.body.data.citizenProfile).toBeNull(); // chưa tạo hồ sơ công dân
  });
});
