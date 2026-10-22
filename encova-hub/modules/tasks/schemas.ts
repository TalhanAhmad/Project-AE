import { z } from "zod";
import { isDatabaseText, databaseTextMessage } from "../shared/text.ts";

export const taskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export const taskFields = ["title", "description", "priority", "assigneeId", "dueDate"] as const;
export type TaskField = (typeof taskFields)[number];
export type TaskFieldErrors = Partial<Record<TaskField | "_form", string[]>>;

const optionalText = z.string().trim().max(5000).refine(isDatabaseText, databaseTextMessage);
export const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1, "Enter a task title.").max(200).refine(isDatabaseText, databaseTextMessage),
  description: optionalText.optional(),
  priority: z.enum(taskPriorities).default("MEDIUM"),
  assigneeId: z.uuid("Choose a valid team member.").nullable().optional(),
  dueDate: z.iso.date("Enter a valid calendar date.").refine((date) => !date.startsWith("0000"), "Year must be at least 0001.").optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const taskStatusSchema = z.strictObject({
  status: z.enum(taskStatuses),
  expectedVersion: z.number().int().positive(),
});
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;

export function taskValidationErrors(error: z.ZodError): TaskFieldErrors {
  const fields: TaskFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && taskFields.includes(key as TaskField)) (fields[key as TaskField] ??= []).push(issue.message);
    else (fields._form ??= []).push("Provide only the allowed task fields.");
  }
  return fields;
}
