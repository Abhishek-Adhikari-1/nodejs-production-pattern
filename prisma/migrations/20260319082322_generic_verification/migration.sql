/*
  Warnings:

  - The values [EMAIL_CHANGE] on the enum `VerificationType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[user_id,type]` on the table `verifications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VerificationType_new" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'OAUTH_STATE', 'MAGIC_LINK');
ALTER TABLE "verifications" ALTER COLUMN "type" TYPE "VerificationType_new" USING ("type"::text::"VerificationType_new");
ALTER TYPE "VerificationType" RENAME TO "VerificationType_old";
ALTER TYPE "VerificationType_new" RENAME TO "VerificationType";
DROP TYPE "public"."VerificationType_old";
COMMIT;

-- DropIndex
DROP INDEX "verifications_token_idx";

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "meta" JSONB,
ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "verifications_user_id_type_key" ON "verifications"("user_id", "type");
