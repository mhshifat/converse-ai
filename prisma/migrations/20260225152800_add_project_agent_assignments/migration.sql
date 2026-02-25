-- CreateTable
CREATE TABLE "project_agent" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "is_default_chat" BOOLEAN NOT NULL DEFAULT false,
    "is_default_voice" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_agent_project_id_idx" ON "project_agent"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_agent_project_id_agent_id_key" ON "project_agent"("project_id", "agent_id");

-- AddForeignKey
ALTER TABLE "project_agent" ADD CONSTRAINT "project_agent_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_agent" ADD CONSTRAINT "project_agent_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
