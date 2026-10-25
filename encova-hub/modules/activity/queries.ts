import "server-only";
import type { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import type { AppUser } from "../auth/types.ts";
import type { ActivityAction, ActivityDetails, ProjectActivity } from "./types.ts";

type ActivityInput = {
  projectId: string;
  taskId?: string;
  actorId: string;
  action: ActivityAction;
  details?: ActivityDetails;
};

// Call this only inside the mutation's existing transaction. If this insert
// fails, Prisma rejects the transaction and the related mutation rolls back.
export async function appendActivity(transaction: Prisma.TransactionClient, input: ActivityInput): Promise<void> {
  await transaction.activityLog.create({
    data: {
      projectId: input.projectId,
      taskId: input.taskId,
      actorId: input.actorId,
      action: input.action,
      details: input.details ?? {},
    },
  });
}

const safeDetailKeys = new Set(["status", "priority", "assigneeId", "fromStatus", "toStatus", "changedFields", "milestoneId"]);

function serializeDetails(value: Prisma.JsonValue): ActivityDetails {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  const details: ActivityDetails = {};
  for (const [key, detail] of Object.entries(value)) {
    if (safeDetailKeys.has(key) && (typeof detail === "string" || typeof detail === "number" || typeof detail === "boolean" || detail === null)) details[key] = detail;
  }
  return details;
}

export async function listProjectActivity(actor: AppUser, projectId: string): Promise<ProjectActivity[]> {
  const db = getDatabase();
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, members: { where: { userId: actor.id }, select: { userId: true } } } });
  if (!project || (actor.role !== "OWNER" && !project.members.length)) throw new DomainError(404, "PROJECT_NOT_FOUND", "Project not found.");
  const rows = await db.activityLog.findMany({
    where: { projectId },
    select: { id: true, projectId: true, taskId: true, action: true, details: true, createdAt: true, actor: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map((row) => ({ ...row, details: serializeDetails(row.details), createdAt: row.createdAt.toISOString() }));
}
