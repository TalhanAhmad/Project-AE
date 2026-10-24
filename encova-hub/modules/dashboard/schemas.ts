import { z } from "zod";

const assignedTaskSchema = z.strictObject({
  id: z.uuid(), projectId: z.uuid(), projectName: z.string().min(1).max(120), title: z.string().min(1).max(200),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]), priority: z.enum(["LOW", "MEDIUM", "HIGH"]), dueDate: z.iso.date().nullable(),
});

export const dashboardResponseSchema = z.strictObject({
  data: z.strictObject({
    activeProjects: z.number().int().nonnegative(), overdueTasks: z.number().int().nonnegative(), completedTasks: z.number().int().nonnegative(),
    assignedWork: z.array(assignedTaskSchema).max(12),
  }),
});
