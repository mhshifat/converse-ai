-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "first_response_at" TIMESTAMP(3),
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "rated_at" TIMESTAMP(3),
ADD COLUMN     "rating_type" TEXT,
ADD COLUMN     "rating_value" INTEGER,
ADD COLUMN     "skill_tags" JSONB,
ADD COLUMN     "transferred_to_agent_id" TEXT;

-- AlterTable
ALTER TABLE "human_agent" ADD COLUMN     "skill_tags" JSONB;

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "payload" JSONB;

-- AlterTable
ALTER TABLE "project_knowledge" ADD COLUMN     "source_ref" TEXT,
ADD COLUMN     "source_type" TEXT;

-- CreateTable
CREATE TABLE "canned_response" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT,
    "shortcut" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canned_response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_version" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "canned_response_tenant_id_idx" ON "canned_response"("tenant_id");

-- CreateIndex
CREATE INDEX "canned_response_tenant_id_project_id_idx" ON "canned_response"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "agent_version_agent_id_idx" ON "agent_version"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_version_agent_id_version_key" ON "agent_version"("agent_id", "version");

-- CreateIndex
CREATE INDEX "conversation_status_handoff_requested_at_idx" ON "conversation"("status", "handoff_requested_at");

-- CreateIndex
CREATE INDEX "message_conversation_id_idx" ON "message"("conversation_id");

-- AddForeignKey
ALTER TABLE "canned_response" ADD CONSTRAINT "canned_response_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_version" ADD CONSTRAINT "agent_version_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
