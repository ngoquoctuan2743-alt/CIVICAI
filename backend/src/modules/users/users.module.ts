import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitizenProfileEntity } from '../../database/entities/citizen-profile.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/** Module quản lý tài khoản người dùng */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, CitizenProfileEntity]), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
