-- Supports the permission-scoped task workspace's stable due-date ordering.
CREATE INDEX "tasks_project_visible_due_created_id_idx"
ON "tasks" ("project_id", "deleted_at", "due_date" ASC NULLS LAST, "created_at" DESC, "id" DESC);
