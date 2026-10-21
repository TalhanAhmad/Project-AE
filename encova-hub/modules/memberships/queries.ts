import "server-only";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import type { AddProjectMemberInput } from "./schemas.ts";
import type { ProjectMember } from "./types.ts";

const select = {
  userId: true,
  joinedAt: true,
  user: { select: { name: true, role: true } },
} as const;

function serialize(row: { userId: string; joinedAt: Date; user: { name: string; role: "OWNER" | "MEMBER" } }): ProjectMember {
  return { userId: row.userId, name: row.user.name, role: row.user.role, joinedAt: row.joinedAt.toISOString() };
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return (await getDatabase().projectMember.findMany({
    where: { projectId },
    select,
    orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
  })).map(serialize);
}

export async function addProjectMember(projectId: string, input: AddProjectMemberInput): Promise<ProjectMember> {
  return getDatabase().$transaction(async (transaction) => {
    const project = await transaction.project.findUnique({
      where: { id: projectId },
      select: { id: true, archivedAt: true },
    });
    if (!project) throw new DomainError(404, "PROJECT_NOT_FOUND", "Choose an existing project.");
    if (project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing members.");
    const user = await transaction.user.findUnique({ where: { id: input.userId }, select: { id: true, isActive: true } });
    if (!user) throw new DomainError(404, "USER_NOT_FOUND", "Choose an existing team member.");
    if (!user.isActive) throw new DomainError(409, "USER_INACTIVE", "Choose an active team member.");
    return serialize(await transaction.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: input.userId } },
      create: { projectId, userId: input.userId },
      update: {},
      select,
    }));
  }, { maxWait: 5000, timeout: 10000 });
}
