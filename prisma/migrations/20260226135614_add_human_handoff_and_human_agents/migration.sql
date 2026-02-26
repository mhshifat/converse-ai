-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "assigned_human_agent_id" TEXT,
ADD COLUMN     "handoff_requested_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "human_agent" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "human_agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "human_agent_tenant_id_idx" ON "human_agent"("tenant_id");

-- CreateIndex
CREATE INDEX "human_agent_tenant_id_is_available_idx" ON "human_agent"("tenant_id", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "human_agent_tenant_id_user_id_key" ON "human_agent"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "conversation_handoff_requested_at_assigned_human_agent_id_idx" ON "conversation"("handoff_requested_at", "assigned_human_agent_id");

-- AddForeignKey
ALTER TABLE "human_agent" ADD CONSTRAINT "human_agent_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
