import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmbeddingPipeline1784407757348 implements MigrationInterface {
    name = 'AddEmbeddingPipeline1784407757348'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."embedding_job_status" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'RETRYING', 'FAILED', 'DEAD_LETTER', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "embedding_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "document_id" uuid NOT NULL, "document_version_id" uuid NOT NULL, "embedding_model" character varying(50) NOT NULL, "embedding_model_version" character varying(100) NOT NULL, "status" "public"."embedding_job_status" NOT NULL DEFAULT 'QUEUED', "attempts" integer NOT NULL DEFAULT '0', "max_attempts" integer NOT NULL DEFAULT '3', "total_chunks" integer NOT NULL DEFAULT '0', "embedded_count" integer NOT NULL DEFAULT '0', "failed_count" integer NOT NULL DEFAULT '0', "error_reason" text, "queued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "requested_by" uuid, CONSTRAINT "PK_61997275dd4c7590510e3d0f006" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_embjob_document" ON "embedding_jobs"  ("document_id") `);
        await queryRunner.query(`CREATE INDEX "idx_embjob_version" ON "embedding_jobs"  ("document_version_id") `);
        await queryRunner.query(`CREATE INDEX "idx_embjob_status" ON "embedding_jobs"  ("status") `);
        await queryRunner.query(`CREATE TYPE "public"."embedding_status" AS ENUM('PENDING', 'READY', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "embeddings" ("id" uuid NOT NULL, "chunk_id" uuid NOT NULL, "document_version_id" uuid NOT NULL, "embedding_model" character varying(50) NOT NULL, "embedding_model_version" character varying(100) NOT NULL, "dimension" integer NOT NULL, "checksum" character varying(64) NOT NULL, "status" "public"."embedding_status" NOT NULL DEFAULT 'PENDING', "is_active" boolean NOT NULL DEFAULT false, "failure_reason" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_19b6b451e1ef345884caca1f544" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_embeddings_chunk" ON "embeddings"  ("chunk_id") `);
        await queryRunner.query(`CREATE INDEX "idx_embeddings_version" ON "embeddings"  ("document_version_id") `);
        await queryRunner.query(`CREATE INDEX "idx_embeddings_status" ON "embeddings"  ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_embeddings_active" ON "embeddings"  ("is_active") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_embeddings_chunk_model_version" ON "embeddings"  ("chunk_id", "embedding_model", "embedding_model_version") `);
        await queryRunner.query(`ALTER TABLE "embedding_jobs" ADD CONSTRAINT "FK_ced619455d500ce04b40e0e0927" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "embedding_jobs" ADD CONSTRAINT "FK_cd099bbd5c774edd7b68c56bdea" FOREIGN KEY ("document_version_id") REFERENCES "knowledge_document_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "embedding_jobs" ADD CONSTRAINT "FK_f50b9a1a924aa1c5dc9fc438a3f" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "embeddings" ADD CONSTRAINT "FK_84ee81f57b2d0df18fec67ae4c4" FOREIGN KEY ("chunk_id") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "embeddings" ADD CONSTRAINT "FK_28149c821f471fcc5d5827f4492" FOREIGN KEY ("document_version_id") REFERENCES "knowledge_document_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Cột vector pgvector — KHÔNG khai báo qua TypeORM @Column (không có
        // type gốc cho 'vector'), thêm bằng raw SQL. HNSW index thật (không
        // phải cast float4[]-chưa-index như kb_chunks cũ) — đúng khuyến nghị
        // đã nêu trong docs/rag-architecture-v2.md mục Scalability.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        await queryRunner.query(`ALTER TABLE "embeddings" ADD COLUMN "vector" vector(768)`);
        await queryRunner.query(`CREATE INDEX "idx_embeddings_vector_hnsw" ON "embeddings" USING hnsw ("vector" vector_cosine_ops)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_embeddings_vector_hnsw"`);
        await queryRunner.query(`ALTER TABLE "embeddings" DROP COLUMN "vector"`);
        await queryRunner.query(`ALTER TABLE "embeddings" DROP CONSTRAINT "FK_28149c821f471fcc5d5827f4492"`);
        await queryRunner.query(`ALTER TABLE "embeddings" DROP CONSTRAINT "FK_84ee81f57b2d0df18fec67ae4c4"`);
        await queryRunner.query(`ALTER TABLE "embedding_jobs" DROP CONSTRAINT "FK_f50b9a1a924aa1c5dc9fc438a3f"`);
        await queryRunner.query(`ALTER TABLE "embedding_jobs" DROP CONSTRAINT "FK_cd099bbd5c774edd7b68c56bdea"`);
        await queryRunner.query(`ALTER TABLE "embedding_jobs" DROP CONSTRAINT "FK_ced619455d500ce04b40e0e0927"`);
        await queryRunner.query(`DROP INDEX "public"."uq_embeddings_chunk_model_version"`);
        await queryRunner.query(`DROP INDEX "public"."idx_embeddings_active"`);
        await queryRunner.query(`DROP INDEX "public"."idx_embeddings_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_embeddings_version"`);
        await queryRunner.query(`DROP INDEX "public"."idx_embeddings_chunk"`);
        await queryRunner.query(`DROP TABLE "embeddings"`);
        await queryRunner.query(`DROP TYPE "public"."embedding_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_embjob_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_embjob_version"`);
        await queryRunner.query(`DROP INDEX "public"."idx_embjob_document"`);
        await queryRunner.query(`DROP TABLE "embedding_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."embedding_job_status"`);
    }

}
