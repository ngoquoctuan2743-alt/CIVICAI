import { hash } from 'bcryptjs';
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Số vòng băm bcrypt — khớp BCRYPT_ROUNDS của AuthService (auth.service.ts) */
const BCRYPT_ROUNDS = 10;
/** Mật khẩu demo dùng chung — CHỈ dùng cho môi trường demo/QA, khớp DEMO_PASSWORD ở SeedDemoDataExpansion */
const DEMO_PASSWORD = 'Demo@2026';

/**
 * Seed tài khoản admin_demo@vaic.gov.vn — dành RIÊNG cho Demo Mode (F9/F10/F11),
 * tách biệt hoàn toàn khỏi admin1@vaic.gov.vn thật. Mọi hội thoại/tài liệu tạo ra
 * trong lúc chạy demo đều thuộc sở hữu tài khoản này, nên reset demo (xoá theo
 * user_id) không bao giờ đụng tới dữ liệu của admin thật. Idempotent theo email.
 */
export class SeedDemoAdminAccount1784444535740 implements MigrationInterface {
  name = 'SeedDemoAdminAccount1784444535740';

  public async up(q: QueryRunner): Promise<void> {
    const passwordHash = await hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
    await q.query(
      `INSERT INTO users (id, email, password_hash, full_name, phone, status, version)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'ACTIVE', 1)
       ON CONFLICT DO NOTHING`,
      ['admin_demo@vaic.gov.vn', passwordHash, 'Demo Administrator', '0900000099'],
    );
    await q.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT usr.id, r.id FROM users usr, roles r
       WHERE usr.email = $1 AND r.code = 'ADMIN'
       ON CONFLICT DO NOTHING`,
      ['admin_demo@vaic.gov.vn'],
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM users WHERE email = 'admin_demo@vaic.gov.vn'`,
    );
  }
}
