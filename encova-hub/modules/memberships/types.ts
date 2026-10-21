import type { UserRole } from "../../types/domain.ts";

export type ProjectMember = {
  userId: string;
  name: string;
  role: UserRole;
  joinedAt: string;
};
