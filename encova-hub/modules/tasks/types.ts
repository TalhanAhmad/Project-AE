import type { Priority, TaskStatus } from "../../types/domain.ts";

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee: { id: string; name: string } | null;
  dueDate: string | null;
  createdBy: { id: string; name: string };
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceTask = Task & { project: { id: string; name: string } };
export type TaskPage = { data: WorkspaceTask[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
