CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "project_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "due_date" DATE,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_milestones_title_nonblank" CHECK (title ~ '[^[:space:]]'),
    CONSTRAINT "project_milestones_version_positive" CHECK (version > 0),
    CONSTRAINT "project_milestones_id_project_id_key" UNIQUE ("id", "project_id")
);

ALTER TABLE "tasks" ADD COLUMN "milestone_id" UUID;

CREATE INDEX "project_milestones_project_id_status_due_date_idx"
ON "project_milestones" ("project_id", "status", "due_date");

ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_project_id_fkey"
FOREIGN KEY ("milestone_id", "project_id") REFERENCES "project_milestones"("id", "project_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
