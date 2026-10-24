import type { Priority, TaskStatus } from "../../types/domain.ts";

export type AssignedDashboardTask = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
};

export type DashboardSummary = {
  activeProjects: number;
  overdueTasks: number;
  completedTasks: number;
  assignedWork: AssignedDashboardTask[];
};
