/**
 * Các môi trường chạy hợp lệ của ứng dụng.
 * Đồng bộ với deployment/environments/ ở cấp dự án.
 */
export enum Environment {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}
