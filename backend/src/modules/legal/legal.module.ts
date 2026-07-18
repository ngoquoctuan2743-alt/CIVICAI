import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalDocumentEntity } from '../../database/entities/legal-document.entity';
import { LegalAdminController } from './legal.admin.controller';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

/** Module kho văn bản pháp luật */
@Module({
  imports: [TypeOrmModule.forFeature([LegalDocumentEntity])],
  controllers: [LegalController, LegalAdminController],
  providers: [LegalService],
})
export class LegalModule {}
