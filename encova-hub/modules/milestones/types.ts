import type { MilestoneStatus } from "../../types/domain.ts";

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  dueDate: string | null;
  status: MilestoneStatus;
  version: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskMilestoneLink = {
  taskId: string;
  milestoneId: string | null;
  version: number;
};
