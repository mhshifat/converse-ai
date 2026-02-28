-- AlterTable project
ALTER TABLE "project" ADD COLUMN "default_rating_type" TEXT DEFAULT 'thumbs';
ALTER TABLE "project" ADD COLUMN "business_hours" JSONB;
ALTER TABLE "project" ADD COLUMN "out_of_office_message" TEXT;
ALTER TABLE "project" ADD COLUMN "queue_overflow_message" TEXT;
ALTER TABLE "project" ADD COLUMN "sla_escalate_minutes" INTEGER;
ALTER TABLE "project" ADD COLUMN "escalation_keywords" JSONB;
ALTER TABLE "project" ADD COLUMN "proactive_delay_seconds" INTEGER;
ALTER TABLE "project" ADD COLUMN "proactive_on_exit_intent" BOOLEAN DEFAULT false;

-- CreateTable contact
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT,
    "external_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contact_tenant_id_project_id_external_id_key" ON "contact"("tenant_id", "project_id", "external_id");
CREATE INDEX "contact_tenant_id_idx" ON "contact"("tenant_id");
CREATE INDEX "contact_project_id_idx" ON "contact"("project_id");

ALTER TABLE "contact" ADD CONSTRAINT "contact_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact" ADD CONSTRAINT "contact_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
