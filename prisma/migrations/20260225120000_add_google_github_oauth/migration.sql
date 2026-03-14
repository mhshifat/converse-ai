-- AlterTable: add OAuth fields and make password_hash optional for OAuth-only users
ALTER TABLE "user" ADD COLUMN "google_id" TEXT;
ALTER TABLE "user" ADD COLUMN "github_id" TEXT;
ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE UNIQUE INDEX "user_google_id_key" ON "user"("google_id");
CREATE UNIQUE INDEX "user_github_id_key" ON "user"("github_id");
