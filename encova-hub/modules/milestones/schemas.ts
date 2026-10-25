import { z } from "zod";
import { databaseTextMessage, isDatabaseText } from "../shared/text.ts";

export const milestoneStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED"] as const;
export const milestoneFields = ["title", "dueDate", "status"] as const;
export type MilestoneField = (typeof milestoneFields)[number];
export type MilestoneFieldErrors = Partial<Record<MilestoneField | "_form", string[]>>;

const title = z.string().trim().min(1, "Enter a milestone title.").max(200).refine(isDatabaseText, databaseTextMessage);
const dueDate = z.iso.date("Enter a valid calendar date.").refine((date) => !date.startsWith("0000"), "Year must be at least 0001.");
const expectedVersion = z.number().int().positive();

export const createMilestoneSchema = z.strictObject({
  title,
  dueDate: dueDate.optional(),
  status: z.enum(milestoneStatuses).default("PLANNED"),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = z.strictObject({
  title: title.optional(),
  dueDate: dueDate.nullable().optional(),
  status: z.enum(milestoneStatuses).optional(),
  expectedVersion,
}).refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "Provide a milestone field to update.");
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export const deleteMilestoneSchema = z.strictObject({ expectedVersion });
export type DeleteMilestoneInput = z.infer<typeof deleteMilestoneSchema>;

export const linkTaskMilestoneSchema = z.strictObject({ milestoneId: z.uuid("Choose a valid milestone."), expectedVersion });
export type LinkTaskMilestoneInput = z.infer<typeof linkTaskMilestoneSchema>;

export const unlinkTaskMilestoneSchema = z.strictObject({ expectedVersion });
export type UnlinkTaskMilestoneInput = z.infer<typeof unlinkTaskMilestoneSchema>;

export const setTaskMilestoneSchema = z.union([
  linkTaskMilestoneSchema,
  z.strictObject({ milestoneId: z.null(), expectedVersion }),
]);
export type SetTaskMilestoneInput = z.infer<typeof setTaskMilestoneSchema>;

export function milestoneValidationErrors(error: z.ZodError): MilestoneFieldErrors {
  const fields: MilestoneFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && milestoneFields.includes(key as MilestoneField)) (fields[key as MilestoneField] ??= []).push(issue.message);
    else (fields._form ??= []).push("Provide only the allowed milestone fields.");
  }
  return fields;
}
