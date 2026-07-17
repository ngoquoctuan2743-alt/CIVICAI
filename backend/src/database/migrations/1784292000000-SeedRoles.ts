import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed 2 role gốc của hệ thống (đã báo cáo và được duyệt ở PHASE 2):
 * - ADMIN:   quản trị hệ thống
 * - CITIZEN: công dân — gán mặc định khi đăng ký
 * Idempotent: ON CONFLICT (code) DO NOTHING.
 */
export class SeedRoles1784292000000 implements MigrationInterface {
  name = 'SeedRoles1784292000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "code", "name", "description")
      VALUES
        (uuid_generate_v4(), 'ADMIN',   'Quản trị viên', 'Quản trị hệ thống, kho tri thức và thủ tục'),
        (uuid_generate_v4(), 'CITIZEN', 'Công dân',      'Người dân sử dụng dịch vụ')
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "roles" WHERE "code" IN ('ADMIN', 'CITIZEN')`);
  }
}
