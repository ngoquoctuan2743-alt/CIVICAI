import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrativeUnitEntity } from '../../database/entities/administrative-unit.entity';
import { CitizenProfileEntity } from '../../database/entities/citizen-profile.entity';
import { CitizenController } from './citizen.controller';
import { CitizenService } from './citizen.service';

/** Module hồ sơ công dân */
@Module({
  imports: [TypeOrmModule.forFeature([CitizenProfileEntity, AdministrativeUnitEntity])],
  controllers: [CitizenController],
  providers: [CitizenService],
})
export class CitizenModule {}
