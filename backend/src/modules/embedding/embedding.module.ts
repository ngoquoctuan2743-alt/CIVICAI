import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunkEntity } from '../../database/entities/document-chunk.entity';
import { EmbeddingJobEntity } from '../../database/entities/embedding-job.entity';
import { EmbeddingEntity } from '../../database/entities/embedding.entity';
import { EmbeddingAdminController } from './embedding.admin.controller';
import { EmbeddingQueueService } from './embedding-queue.service';
import { EmbeddingProviderRegistry } from './providers/embedding-provider.registry';

/** Embedding Pipeline & Vector Indexing (Prompt 04) */
@Module({
  imports: [TypeOrmModule.forFeature([EmbeddingJobEntity, EmbeddingEntity, DocumentChunkEntity])],
  controllers: [EmbeddingAdminController],
  providers: [EmbeddingQueueService, EmbeddingProviderRegistry],
  exports: [EmbeddingQueueService],
})
export class EmbeddingModule {}
