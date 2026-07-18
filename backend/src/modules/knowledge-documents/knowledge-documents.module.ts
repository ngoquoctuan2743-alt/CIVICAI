import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeDocumentTagEntity } from '../../database/entities/knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from '../../database/entities/knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from '../../database/entities/knowledge-document.entity';
import { ChunkingModule } from '../chunking/chunking.module';
import { KnowledgeDocumentsAdminController } from './knowledge-documents.admin.controller';
import { KnowledgeDocumentsService } from './knowledge-documents.service';

/** Document Ingestion Pipeline (Prompt 02) — upload/versioning/lifecycle tài liệu kho tri thức RAG */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeDocumentEntity,
      KnowledgeDocumentVersionEntity,
      KnowledgeDocumentTagEntity,
    ]),
    ChunkingModule,
  ],
  controllers: [KnowledgeDocumentsAdminController],
  providers: [KnowledgeDocumentsService],
  exports: [KnowledgeDocumentsService],
})
export class KnowledgeDocumentsModule {}
