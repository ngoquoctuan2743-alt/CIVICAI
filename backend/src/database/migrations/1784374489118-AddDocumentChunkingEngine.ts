import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentChunkingEngine1784374489118 implements MigrationInterface {
    name = 'AddDocumentChunkingEngine1784374489118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."chunk_processing_status" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "chunk_processing_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "document_id" uuid NOT NULL, "document_version_id" uuid NOT NULL, "status" "public"."chunk_processing_status" NOT NULL DEFAULT 'QUEUED', "attempts" integer NOT NULL DEFAULT '0', "max_attempts" integer NOT NULL DEFAULT '3', "error_reason" text, "chunks_produced" integer, "duration_ms" integer, "queued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "requested_by" uuid, CONSTRAINT "PK_4757e0db7b25f19a080c59bdf78" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_cpjob_document" ON "chunk_processing_jobs"  ("document_id") `);
        await queryRunner.query(`CREATE INDEX "idx_cpjob_version" ON "chunk_processing_jobs"  ("document_version_id") `);
        await queryRunner.query(`CREATE INDEX "idx_cpjob_status" ON "chunk_processing_jobs"  ("status") `);
        await queryRunner.query(`CREATE TABLE "document_chunks" ("id" uuid NOT NULL, "document_id" uuid NOT NULL, "document_version_id" uuid NOT NULL, "chunk_index" integer NOT NULL, "content" text NOT NULL, "page_number" integer, "section_title" character varying(500), "heading_path" jsonb NOT NULL DEFAULT '[]', "char_start" integer NOT NULL, "char_end" integer NOT NULL, "word_count" integer NOT NULL, "language" character varying(10) NOT NULL, "source_type" character varying(50) NOT NULL DEFAULT 'KNOWLEDGE_DOCUMENT', "category" "public"."knowledge_document_category" NOT NULL, "agency_id" uuid, "tags" jsonb NOT NULL DEFAULT '[]', "checksum" character varying(64) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f9060084e9b872dbb567193978" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_document_chunks_document" ON "document_chunks"  ("document_id") `);
        await queryRunner.query(`CREATE INDEX "idx_document_chunks_version" ON "document_chunks"  ("document_version_id") `);
        await queryRunner.query(`CREATE INDEX "idx_document_chunks_category" ON "document_chunks"  ("category") `);
        await queryRunner.query(`CREATE INDEX "idx_document_chunks_checksum" ON "document_chunks"  ("checksum") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_document_chunks_version_index" ON "document_chunks"  ("document_version_id", "chunk_index") `);
        await queryRunner.query(`CREATE TYPE "public"."parsing_log_level" AS ENUM('INFO', 'WARN', 'ERROR')`);
        await queryRunner.query(`CREATE TABLE "parsing_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "job_id" uuid NOT NULL, "level" "public"."parsing_log_level" NOT NULL DEFAULT 'INFO', "message" text NOT NULL, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e8a8b7f4aab75e0145518d84ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_parsinglog_job" ON "parsing_logs"  ("job_id") `);
        await queryRunner.query(`ALTER TABLE "chunk_processing_jobs" ADD CONSTRAINT "FK_2e58a2f59ee57dfd3c54cd5664b" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chunk_processing_jobs" ADD CONSTRAINT "FK_1a492d60fcad82fecf7fafa453a" FOREIGN KEY ("document_version_id") REFERENCES "knowledge_document_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chunk_processing_jobs" ADD CONSTRAINT "FK_a0e0a461e6cdf95e1ea29cf8078" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_chunks" ADD CONSTRAINT "FK_b371ff8bc1e4f65fc3d01420be5" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_chunks" ADD CONSTRAINT "FK_622d670d3aa7e3a96a18d63bc50" FOREIGN KEY ("document_version_id") REFERENCES "knowledge_document_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_chunks" ADD CONSTRAINT "FK_bc761c8e09582f0a7e269bda189" FOREIGN KEY ("agency_id") REFERENCES "government_agencies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parsing_logs" ADD CONSTRAINT "FK_a55537713bd91038f8e0763d4f3" FOREIGN KEY ("job_id") REFERENCES "chunk_processing_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parsing_logs" DROP CONSTRAINT "FK_a55537713bd91038f8e0763d4f3"`);
        await queryRunner.query(`ALTER TABLE "document_chunks" DROP CONSTRAINT "FK_bc761c8e09582f0a7e269bda189"`);
        await queryRunner.query(`ALTER TABLE "document_chunks" DROP CONSTRAINT "FK_622d670d3aa7e3a96a18d63bc50"`);
        await queryRunner.query(`ALTER TABLE "document_chunks" DROP CONSTRAINT "FK_b371ff8bc1e4f65fc3d01420be5"`);
        await queryRunner.query(`ALTER TABLE "chunk_processing_jobs" DROP CONSTRAINT "FK_a0e0a461e6cdf95e1ea29cf8078"`);
        await queryRunner.query(`ALTER TABLE "chunk_processing_jobs" DROP CONSTRAINT "FK_1a492d60fcad82fecf7fafa453a"`);
        await queryRunner.query(`ALTER TABLE "chunk_processing_jobs" DROP CONSTRAINT "FK_2e58a2f59ee57dfd3c54cd5664b"`);
        await queryRunner.query(`DROP INDEX "public"."idx_parsinglog_job"`);
        await queryRunner.query(`DROP TABLE "parsing_logs"`);
        await queryRunner.query(`DROP TYPE "public"."parsing_log_level"`);
        await queryRunner.query(`DROP INDEX "public"."uq_document_chunks_version_index"`);
        await queryRunner.query(`DROP INDEX "public"."idx_document_chunks_checksum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_document_chunks_category"`);
        await queryRunner.query(`DROP INDEX "public"."idx_document_chunks_version"`);
        await queryRunner.query(`DROP INDEX "public"."idx_document_chunks_document"`);
        await queryRunner.query(`DROP TABLE "document_chunks"`);
        await queryRunner.query(`DROP INDEX "public"."idx_cpjob_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_cpjob_version"`);
        await queryRunner.query(`DROP INDEX "public"."idx_cpjob_document"`);
        await queryRunner.query(`DROP TABLE "chunk_processing_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."chunk_processing_status"`);
    }

}
