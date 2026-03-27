-- AlterTable
ALTER TABLE "chatbot" ADD COLUMN     "last_embed_beacon_at" TIMESTAMP(3),
ADD COLUMN     "last_embed_origin" VARCHAR(512);
