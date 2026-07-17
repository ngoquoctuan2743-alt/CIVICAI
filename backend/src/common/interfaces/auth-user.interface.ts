/**
 * Thông tin người dùng đã xác thực — được AuthGuard gắn vào request.user
 * sau khi verify JWT. Đây là hình dạng payload của access token.
 */
export interface AuthUser {
  /** users.id (claim `sub` trong JWT) */
  userId: string;
  email: string;
  /** Danh sách mã role, vd: ['CITIZEN'] */
  roles: string[];
}
