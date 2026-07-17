import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/app.constants';

/**
 * Đánh dấu route/controller là CÔNG KHAI — AuthGuard sẽ bỏ qua xác thực.
 *
 * Mặc định toàn hệ thống là "secure by default": mọi route đều yêu cầu
 * xác thực trừ khi gắn @Public() một cách chủ động.
 *
 * @example
 * @Public()
 * @Get('health')
 * getHealth() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
