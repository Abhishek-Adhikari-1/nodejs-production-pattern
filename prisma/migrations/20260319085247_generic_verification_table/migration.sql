-- DropIndex
DROP INDEX "verifications_user_id_type_key";

-- CreateIndex
CREATE INDEX "verifications_user_id_type_idx" ON "verifications"("user_id", "type");

-- CreateIndex
CREATE INDEX "verifications_type_token_idx" ON "verifications"("type", "token");
