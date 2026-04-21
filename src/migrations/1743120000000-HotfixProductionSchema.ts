import { MigrationInterface, QueryRunner } from "typeorm";

export class HotfixProductionSchema1743120000000 implements MigrationInterface {
  name = "HotfixProductionSchema1743120000000";

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "image_url" TYPE text`,
    );

    await queryRunner.query(
      `ALTER TABLE "inventory_records" ADD COLUMN IF NOT EXISTS "unit_cost" numeric(10,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "image_url" TYPE character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_records" DROP COLUMN "unit_cost"`,
    );
  }
}