import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AiClientModule } from '../ai-client/ai-client.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

/** Module OCR / Document Understanding (PHASE 4) */
@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity]), AiClientModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
