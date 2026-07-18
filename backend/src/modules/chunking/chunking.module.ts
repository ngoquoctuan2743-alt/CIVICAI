import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChunkProcessingJobEntity } from '../../database/entities/chunk-processing-job.entity';
import { DocumentChunkEntity } from '../../database/entities/document-chunk.entity';
import { KnowledgeDocumentTagEntity } from '../../database/entities/knowledge-document-tag.entity';
import { KnowledgeDocumentVersionEntity } from '../../database/entities/knowledge-document-version.entity';
import { KnowledgeDocumentEntity } from '../../database/entities/knowledge-document.entity';
import { ParsingLogEntity } from '../../database/entities/parsing-log.entity';
import { ChunkingAdminController } from './chunking.admin.controller';
import { ChunkProcessingQueueService } from './chunk-processing-queue.service';

/** Document Parsing & Intelligent Chunking Engine (Prompt 03) */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChunkProcessingJobEntity,
      DocumentChunkEntity,
      ParsingLogEntity,
      KnowledgeDocumentVersionEntity,
      KnowledgeDocumentEntity,
      KnowledgeDocumentTagEntity,
    ]),
  ],
  controllers: [ChunkingAdminController],
  providers: [ChunkProcessingQueueService],
  exports: [ChunkProcessingQueueService],
})
export class ChunkingModule {}
