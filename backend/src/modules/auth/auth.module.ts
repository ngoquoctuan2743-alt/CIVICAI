import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { RoleEntity } from '../../database/entities/role.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Module xác thực. Export AuthService để module khác dùng
 * (vd: UsersModule thu hồi token khi xóa tài khoản).
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, RefreshTokenEntity])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
