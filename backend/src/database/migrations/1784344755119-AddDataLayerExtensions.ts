import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDataLayerExtensions1784344755119 implements MigrationInterface {
    name = 'AddDataLayerExtensions1784344755119'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor_user_id" uuid, "action" character varying(100) NOT NULL, "resource_type" character varying(100), "resource_id" uuid, "ip_address" character varying(45), "user_agent" character varying(500), "metadata" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_actor" ON "audit_logs"  ("actor_user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_action" ON "audit_logs"  ("action") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_resource" ON "audit_logs"  ("resource_id") `);
        await queryRunner.query(`CREATE TABLE "voice_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, "conversation_id" uuid, "message_id" uuid, "duration_ms" integer, "transcript" text, "confidence" real, "error_message" character varying(500), CONSTRAINT "PK_c88bc930653b4c23de462cf55e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_voice_logs_user" ON "voice_logs"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_voice_logs_conversation" ON "voice_logs"  ("conversation_id") `);
        await queryRunner.query(`ALTER TABLE "government_agencies" ADD "working_hours" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "administrative_procedures" ADD "category" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "administrative_procedures" ADD "expected_result" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar_url" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "legal_documents" ADD "content" text`);
        await queryRunner.query(`ALTER TABLE "legal_documents" ADD "version" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "legal_documents" ADD "metadata" jsonb`);
        await queryRunner.query(`CREATE INDEX "idx_procedures_category" ON "administrative_procedures"  ("category") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_phone" ON "users"  ("phone") WHERE "deleted_at" IS NULL AND "phone" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_f160d97a931844109de9d04228f" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voice_logs" ADD CONSTRAINT "FK_99d8ca85578820809755326a6b2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voice_logs" ADD CONSTRAINT "FK_a6cd052b8d1516fe9f12ac3fdaa" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voice_logs" ADD CONSTRAINT "FK_a986c84dbe4794b2dbb10eea340" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "voice_logs" DROP CONSTRAINT "FK_a986c84dbe4794b2dbb10eea340"`);
        await queryRunner.query(`ALTER TABLE "voice_logs" DROP CONSTRAINT "FK_a6cd052b8d1516fe9f12ac3fdaa"`);
        await queryRunner.query(`ALTER TABLE "voice_logs" DROP CONSTRAINT "FK_99d8ca85578820809755326a6b2"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_f160d97a931844109de9d04228f"`);
        await queryRunner.query(`DROP INDEX "public"."uq_users_phone"`);
        await queryRunner.query(`DROP INDEX "public"."idx_procedures_category"`);
        await queryRunner.query(`ALTER TABLE "legal_documents" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "legal_documents" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "legal_documents" DROP COLUMN "content"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
        await queryRunner.query(`ALTER TABLE "administrative_procedures" DROP COLUMN "expected_result"`);
        await queryRunner.query(`ALTER TABLE "administrative_procedures" DROP COLUMN "category"`);
        await queryRunner.query(`ALTER TABLE "government_agencies" DROP COLUMN "working_hours"`);
        await queryRunner.query(`DROP INDEX "public"."idx_voice_logs_conversation"`);
        await queryRunner.query(`DROP INDEX "public"."idx_voice_logs_user"`);
        await queryRunner.query(`DROP TABLE "voice_logs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_resource"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_action"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_actor"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
