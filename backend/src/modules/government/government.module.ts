import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrativeProcedureEntity } from '../../database/entities/administrative-procedure.entity';
import { AdministrativeUnitEntity } from '../../database/entities/administrative-unit.entity';
import { GovernmentAgencyEntity } from '../../database/entities/government-agency.entity';
import { GovernmentAdminController } from './government.admin.controller';
import { GovernmentController } from './government.controller';
import { GovernmentService } from './government.service';

/** Module danh bạ cơ quan nhà nước */
@Module({
  imports: [
    TypeOrmModule.forFeature([GovernmentAgencyEntity, AdministrativeProcedureEntity, AdministrativeUnitEntity]),
  ],
  controllers: [GovernmentController, GovernmentAdminController],
  providers: [GovernmentService],
})
export class GovernmentModule {}
