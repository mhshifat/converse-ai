-- AlterTable
ALTER TABLE "project" ADD COLUMN     "knowledge_base_url" TEXT;

-- CreateTable
CREATE TABLE "project_knowledge" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_knowledge_project_id_idx" ON "project_knowledge"("project_id");

-- AddForeignKey
ALTER TABLE "project_knowledge" ADD CONSTRAINT "project_knowledge_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
