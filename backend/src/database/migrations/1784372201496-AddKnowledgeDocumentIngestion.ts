import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKnowledgeDocumentIngestion1784372201496 implements MigrationInterface {
    name = 'AddKnowledgeDocumentIngestion1784372201496'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "knowledge_document_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "document_id" uuid NOT NULL, "tag_name" character varying(100) NOT NULL, CONSTRAINT "PK_9536ba79d908c7f03fe21b69ad1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_kdoc_tags_document_name" ON "knowledge_document_tags"  ("document_id", "tag_name") `);
        await queryRunner.query(`CREATE TYPE "public"."knowledge_document_version_status" AS ENUM('NEW', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'REINDEX_REQUIRED')`);
        await queryRunner.query(`CREATE TABLE "knowledge_document_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "document_id" uuid NOT NULL, "version_number" integer NOT NULL, "storage_key" character varying(500) NOT NULL, "file_name" character varying(255) NOT NULL, "mime_type" character varying(100) NOT NULL, "size_bytes" bigint NOT NULL, "file_hash" character varying(64) NOT NULL, "status" "public"."knowledge_document_version_status" NOT NULL DEFAULT 'NEW', "failure_reason" character varying(500), "uploaded_by" uuid, CONSTRAINT "UQ_406a8098b5b32a9d3f35492fdc6" UNIQUE ("storage_key"), CONSTRAINT "PK_8fa4a449a5e8bee8b592d5179ca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_kdocver_document" ON "knowledge_document_versions"  ("document_id") `);
        await queryRunner.query(`CREATE INDEX "idx_kdocver_hash" ON "knowledge_document_versions"  ("file_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_kdocver_status" ON "knowledge_document_versions"  ("status") `);
        await queryRunner.query(`CREATE TYPE "public"."knowledge_document_category" AS ENUM('LEGAL_DOCUMENT', 'PROCEDURE', 'FAQ', 'CIRCULAR', 'DECREE', 'FORM', 'AGENCY_INFO', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "knowledge_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL, "title" character varying(500) NOT NULL, "category" "public"."knowledge_document_category" NOT NULL, "source" character varying(255), "language" character varying(10) NOT NULL DEFAULT 'vi', "agency_id" uuid, "description" text, "active_version_id" uuid, "status" "public"."knowledge_document_version_status" NOT NULL DEFAULT 'NEW', CONSTRAINT "PK_402a3c43fb263aa5289670e4e21" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_kdoc_title" ON "knowledge_documents"  ("title") `);
        await queryRunner.query(`CREATE INDEX "idx_kdoc_category" ON "knowledge_documents"  ("category") `);
        await queryRunner.query(`CREATE INDEX "idx_kdoc_agency" ON "knowledge_documents"  ("agency_id") `);
        await queryRunner.query(`CREATE INDEX "idx_kdoc_status" ON "knowledge_documents"  ("status") `);
        await queryRunner.query(`ALTER TABLE "knowledge_document_tags" ADD CONSTRAINT "FK_98702e74c25210e13b440f6fe07" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_document_versions" ADD CONSTRAINT "FK_4ff52f6143474bd71ad0c78552c" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_document_versions" ADD CONSTRAINT "FK_ae99fe79c7833a645e4536cf383" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" ADD CONSTRAINT "FK_3be5ab7dd9264973740ebf63be1" FOREIGN KEY ("agency_id") REFERENCES "government_agencies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" ADD CONSTRAINT "FK_fdc05404840aa3ad86080416b29" FOREIGN KEY ("active_version_id") REFERENCES "knowledge_document_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "knowledge_documents" DROP CONSTRAINT "FK_fdc05404840aa3ad86080416b29"`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" DROP CONSTRAINT "FK_3be5ab7dd9264973740ebf63be1"`);
        await queryRunner.query(`ALTER TABLE "knowledge_document_versions" DROP CONSTRAINT "FK_ae99fe79c7833a645e4536cf383"`);
        await queryRunner.query(`ALTER TABLE "knowledge_document_versions" DROP CONSTRAINT "FK_4ff52f6143474bd71ad0c78552c"`);
        await queryRunner.query(`ALTER TABLE "knowledge_document_tags" DROP CONSTRAINT "FK_98702e74c25210e13b440f6fe07"`);
        await queryRunner.query(`DROP INDEX "public"."idx_kdoc_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_kdoc_agency"`);
        await queryRunner.query(`DROP INDEX "public"."idx_kdoc_category"`);
        await queryRunner.query(`DROP INDEX "public"."idx_kdoc_title"`);
        await queryRunner.query(`DROP TABLE "knowledge_documents"`);
        await queryRunner.query(`DROP TYPE "public"."knowledge_document_category"`);
        await queryRunner.query(`DROP INDEX "public"."idx_kdocver_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_kdocver_hash"`);
        await queryRunner.query(`DROP INDEX "public"."idx_kdocver_document"`);
        await queryRunner.query(`DROP TABLE "knowledge_document_versions"`);
        await queryRunner.query(`DROP TYPE "public"."knowledge_document_version_status"`);
        await queryRunner.query(`DROP INDEX "public"."uq_kdoc_tags_document_name"`);
        await queryRunner.query(`DROP TABLE "knowledge_document_tags"`);
    }

}
