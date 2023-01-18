import { MigrationInterface, QueryRunner } from 'typeorm';

export class allMigrationsForAll1674028055898 implements MigrationInterface {
  name = 'allMigrationsForAll1674028055898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("isDeleted" boolean NOT NULL DEFAULT false, "createdOn" TIMESTAMP NOT NULL DEFAULT now(), "lastUpdatedOn" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "phone_number" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'standard', "active" boolean DEFAULT false, "isVerified" boolean NOT NULL DEFAULT false, "currentHashedRefreshToken" character varying, "managerId" integer, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_01eea41349b6c9275aec646eee0" UNIQUE ("phone_number"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile" ("isDeleted" boolean NOT NULL DEFAULT false, "createdOn" TIMESTAMP NOT NULL DEFAULT now(), "lastUpdatedOn" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "resident_country" character varying NOT NULL, "birth_country" character varying NOT NULL, "national_id" character varying NOT NULL, "position" character varying NOT NULL, "postal_code" character varying NOT NULL, "starting_date" TIMESTAMP NOT NULL, "profession" character varying NOT NULL, "salary" character varying NOT NULL, "father_name" character varying NOT NULL, "mother_name" character varying NOT NULL, "gender" character varying NOT NULL, "birth_date" character varying NOT NULL, "province" character varying NOT NULL, "district" character varying NOT NULL, "departmentId" integer, "userId" integer, CONSTRAINT "REL_a24972ebd73b106250713dcddd" UNIQUE ("userId"), CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "department" ("isDeleted" boolean NOT NULL DEFAULT false, "createdOn" TIMESTAMP NOT NULL DEFAULT now(), "lastUpdatedOn" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "department_name" character varying NOT NULL, "hodId" integer, CONSTRAINT "PK_9a2213262c1593bffb581e382f5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "code" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "expiryDate" TIMESTAMP NOT NULL, "userId" integer, CONSTRAINT "REL_76c04a353b3639752b096e75ec" UNIQUE ("userId"), CONSTRAINT "PK_367e70f79a9106b8e802e1a9825" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_df69481de1f438f2082e4d54749" FOREIGN KEY ("managerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_8d6f88161620c6b048326cbd69e" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_a24972ebd73b106250713dcddd9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "department" ADD CONSTRAINT "FK_98e213247c3813626091c18180d" FOREIGN KEY ("hodId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "code" ADD CONSTRAINT "FK_76c04a353b3639752b096e75ec4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "code" DROP CONSTRAINT "FK_76c04a353b3639752b096e75ec4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "department" DROP CONSTRAINT "FK_98e213247c3813626091c18180d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" DROP CONSTRAINT "FK_a24972ebd73b106250713dcddd9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" DROP CONSTRAINT "FK_8d6f88161620c6b048326cbd69e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_df69481de1f438f2082e4d54749"`,
    );
    await queryRunner.query(`DROP TABLE "code"`);
    await queryRunner.query(`DROP TABLE "department"`);
    await queryRunner.query(`DROP TABLE "profile"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
