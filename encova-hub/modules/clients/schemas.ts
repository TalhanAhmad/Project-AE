import { z } from "zod";

export const createClientSchema = z.strictObject({
  name: z.string().trim().min(1, "Enter a client name.").max(120),
  email: z.string().trim().max(254).pipe(z.email()).optional(),
  company: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

// TypeScript cannot check JSON received over HTTP, so check responses at runtime.
export const clientResponseSchema = createClientSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const clientListResponseSchema = z.strictObject({ data: z.array(clientResponseSchema) });
export const clientCreatedResponseSchema = z.strictObject({ data: clientResponseSchema });

export const clientFields = ["name", "email", "company", "notes"] as const;
export type ClientField = (typeof clientFields)[number];
export type ClientFieldErrors = Partial<Record<ClientField | "_form", string[]>>;

export function clientValidationErrors(error: z.ZodError): ClientFieldErrors {
  const fields: ClientFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && clientFields.includes(field as ClientField)) {
      (fields[field as ClientField] ??= []).push(issue.message);
    } else {
      (fields._form ??= []).push(
        issue.code === "unrecognized_keys"
          ? "Only name, email, company, and notes are allowed."
          : "Provide a client object with the required fields.",
      );
    }
  }
  return fields;
}

export const clientErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    fields: z.object({
      name: z.array(z.string()).optional(),
      email: z.array(z.string()).optional(),
      company: z.array(z.string()).optional(),
      notes: z.array(z.string()).optional(),
      _form: z.array(z.string()).optional(),
    }).optional(),
  }),
});
