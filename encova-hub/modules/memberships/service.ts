import "server-only";
import { requireOwner } from "../auth/service.ts";
import type { AppUser } from "../auth/types.ts";
import { addProjectMemberSchema } from "./schemas.ts";
import { addProjectMember, listProjectMembers } from "./queries.ts";
import type { ProjectMember } from "./types.ts";

export async function listMembers(actor: AppUser, projectId: string): Promise<ProjectMember[]> {
  requireOwner(actor);
  return listProjectMembers(projectId);
}

export async function addMember(actor: AppUser, projectId: string, input: unknown): Promise<ProjectMember> {
  requireOwner(actor);
  return addProjectMember(projectId, addProjectMemberSchema.parse(input));
}
