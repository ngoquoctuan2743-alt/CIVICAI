import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernmentAgencyEntity } from '../../database/entities/government-agency.entity';
import { GovernmentController } from './government.controller';
import { GovernmentService } from './government.service';

/** Module danh bạ cơ quan nhà nước */
@Module({
  imports: [TypeOrmModule.forFeature([GovernmentAgencyEntity])],
  controllers: [GovernmentController],
  providers: [GovernmentService],
})
export class GovernmentModule {}
