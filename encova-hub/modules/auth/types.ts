import type { UserRole } from "../../types/domain.ts";

export type AppUser = {
  id: string;
  authSubject: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthenticatedCredential = AppUser & {
  passwordHash: string;
};
