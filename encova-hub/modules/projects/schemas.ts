import { z } from "zod";
import { isDatabaseText, databaseTextMessage } from "../shared/text.ts";

export const projectStatuses = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"] as const;
export const projectFields = ["clientId", "name", "description", "status", "dueDate"] as const;
export type ProjectField = (typeof projectFields)[number];
export type ProjectFieldErrors = Partial<Record<ProjectField | "_form", string[]>>;

export const createProjectSchema = z.strictObject({
  clientId: z.uuid("Choose a valid client."),
  name: z.string().trim().min(1, "Enter a project name.").max(120).refine(isDatabaseText, databaseTextMessage),
  description: z.string().trim().max(5000).refine(isDatabaseText, databaseTextMessage).optional(),
  status: z.enum(projectStatuses).default("PLANNED"),
  dueDate: z.iso.date("Enter a valid calendar date.").refine((date) => !date.startsWith("0000"), "Year must be at least 0001.").optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const projectResponseSchema = z.strictObject({
  id: z.uuid(), clientId: z.uuid(), name: z.string().min(1).max(120),
  description: z.string().max(5000).nullable(),
  status: z.enum(projectStatuses), dueDate: z.iso.date().nullable(),
  version: z.number().int().positive(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  client: z.strictObject({ id: z.uuid(), name: z.string().min(1).max(120) }),
});
export const projectListResponseSchema = z.strictObject({ data: z.array(projectResponseSchema) });
export const projectCreatedResponseSchema = z.strictObject({ data: projectResponseSchema });

export function projectValidationErrors(error: z.ZodError): ProjectFieldErrors {
  const fields: ProjectFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && projectFields.includes(key as ProjectField)) {
      (fields[key as ProjectField] ??= []).push(issue.message);
    } else {
      (fields._form ??= []).push("Provide only the allowed project fields.");
    }
  }
  return fields;
}

export const projectErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    fields: z.object({
      clientId: z.array(z.string()).optional(), name: z.array(z.string()).optional(),
      description: z.array(z.string()).optional(), status: z.array(z.string()).optional(),
      dueDate: z.array(z.string()).optional(), _form: z.array(z.string()).optional(),
    }).optional(),
  }),
});
