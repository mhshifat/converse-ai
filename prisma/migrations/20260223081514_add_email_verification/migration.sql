-- AlterTable
ALTER TABLE "user" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "verification_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_token_token_idx" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_user_id_type_key" ON "verification_token"("user_id", "type");

-- AddForeignKey
ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
