import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalDocumentEntity } from '../../database/entities/legal-document.entity';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

/** Module kho văn bản pháp luật */
@Module({
  imports: [TypeOrmModule.forFeature([LegalDocumentEntity])],
  controllers: [LegalController],
  providers: [LegalService],
})
export class LegalModule {}
