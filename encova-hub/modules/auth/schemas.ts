import { z } from "zod";
import { isDatabaseText, databaseTextMessage } from "../shared/text.ts";

const normalizedEmail = z.string().trim().toLowerCase().max(254).refine(isDatabaseText, databaseTextMessage).pipe(z.email());
const safeName = z.string().trim().min(1, "Enter a name.").max(120).refine(isDatabaseText, databaseTextMessage);

export const credentialSchema = z.strictObject({
  email: normalizedEmail,
  password: z.string().min(12, "Password must be at least 12 characters.").max(128),
});

export const bootstrapOwnerSchema = credentialSchema.extend({ name: safeName });

export function credentialsSubject(email: string): string {
  return `credentials:${email}`;
}
