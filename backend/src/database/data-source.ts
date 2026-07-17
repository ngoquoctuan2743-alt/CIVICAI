import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';

/**
 * TypeORM DataSource — dùng cho CLI migration (generate/run/revert)
 * và sẽ được AppModule tái sử dụng cấu hình ở PHASE 3.
 *
 * Lệnh (chạy trong thư mục backend):
 *   npm run migration:generate src/database/migrations/TenMigration
 *   npm run migration:run
 *   npm run migration:revert
 */
config(); // nạp backend/.env

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5433', 10),
  username: process.env.DB_USER ?? 'vaic',
  password: process.env.DB_PASSWORD ?? 'vaic_dev_password',
  database: process.env.DB_NAME ?? 'vaic',
  // Không bao giờ dùng synchronize — mọi thay đổi schema đi qua migration
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: ALL_ENTITIES,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
