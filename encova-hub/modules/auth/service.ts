import "server-only";
import { z } from "zod";
import { DomainError } from "../../server/errors.ts";
import { verifyPassword } from "./password.ts";
import { credentialSchema } from "./schemas.ts";
import { findActiveUserBySubject, findCredentialByEmail } from "./queries.ts";
import type { AppUser } from "./types.ts";
import { canAttemptLogin, clearLoginFailures, recordLoginFailure } from "./login-rate-limit.ts";

export async function authenticateCredentials(input: unknown): Promise<AppUser | null> {
  const parsed = credentialSchema.safeParse(input);
  if (!parsed.success) return null;
  if (!canAttemptLogin(parsed.data.email)) return null;
  const user = await findCredentialByEmail(parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    recordLoginFailure(parsed.data.email);
    return null;
  }
  clearLoginFailures(parsed.data.email);
  return {
    id: user.id,
    authSubject: user.authSubject,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function resolveActiveUser(subject: string | undefined): Promise<AppUser> {
  if (!subject) throw new DomainError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const user = await findActiveUserBySubject(subject);
  if (!user) throw new DomainError(403, "ACCESS_DENIED", "Your account does not have access.");
  return user;
}

export function requireOwner(user: AppUser): void {
  if (user.role !== "OWNER") throw new DomainError(403, "FORBIDDEN", "Owner access is required.");
}

export function isCredentialValidationError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}
