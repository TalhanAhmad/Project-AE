import "server-only";
import { getDatabase } from "../../server/database.ts";
import type { AppUser, AuthenticatedCredential } from "./types.ts";

const userSelect = {
  id: true,
  authSubject: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
} as const;

function toAppUser(user: { id: string; authSubject: string; email: string; name: string; role: "OWNER" | "MEMBER" }): AppUser {
  return { id: user.id, authSubject: user.authSubject, email: user.email, name: user.name, role: user.role };
}

export async function findActiveUserBySubject(subject: string): Promise<AppUser | null> {
  const user = await getDatabase().user.findUnique({ where: { authSubject: subject }, select: userSelect });
  return user?.isActive ? toAppUser(user) : null;
}

export async function findCredentialByEmail(email: string): Promise<AuthenticatedCredential | null> {
  const user = await getDatabase().user.findUnique({
    where: { email },
    select: { ...userSelect, credential: { select: { subject: true, passwordHash: true } } },
  });
  if (!user?.isActive || !user.credential || user.credential.subject !== user.authSubject) return null;
  return { ...toAppUser(user), passwordHash: user.credential.passwordHash };
}
