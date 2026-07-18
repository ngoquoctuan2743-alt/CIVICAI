import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrativeProcedureEntity } from '../../database/entities/administrative-procedure.entity';
import { ProceduresAdminController } from './procedures.admin.controller';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';

/** Module thủ tục hành chính */
@Module({
  imports: [TypeOrmModule.forFeature([AdministrativeProcedureEntity])],
  controllers: [ProceduresController, ProceduresAdminController],
  providers: [ProceduresService],
})
export class ProceduresModule {}
