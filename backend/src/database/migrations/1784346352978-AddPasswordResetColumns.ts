import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetColumns1784346352978 implements MigrationInterface {
    name = 'AddPasswordResetColumns1784346352978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "reset_token_hash" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "reset_token_expires_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_token_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_token_hash"`);
    }

}
