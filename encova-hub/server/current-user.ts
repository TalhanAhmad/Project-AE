import "server-only";
import { resolveActiveUser } from "../modules/auth/service.ts";
import type { AppUser } from "../modules/auth/types.ts";

// The database lookup happens for every protected request. It prevents an old
// JWT from retaining access after a user is deactivated or their role changes.
async function resolveCurrentUser(): Promise<AppUser> {
  // Keep direct Node unit tests independent of the framework-only Auth.js
  // runtime. Next.js resolves this module when an actual request needs it.
  const { auth } = await import("../auth.ts");
  const session = await auth();
  return resolveActiveUser(session?.user?.id);
}

// A small object keeps request identity replaceable in isolated unit tests
// without weakening the service authorization checks.
export const currentUserResolver = { get: resolveCurrentUser };

export function getCurrentUser(): Promise<AppUser> {
  return currentUserResolver.get();
}
