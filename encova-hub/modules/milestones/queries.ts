import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import { appendActivity } from "../activity/queries.ts";
import type { AppUser } from "../auth/types.ts";
import type { CreateMilestoneInput, DeleteMilestoneInput, LinkTaskMilestoneInput, UnlinkTaskMilestoneInput, UpdateMilestoneInput } from "./schemas.ts";
import type { Milestone, TaskMilestoneLink } from "./types.ts";

const select = {
  id: true, projectId: true, title: true, dueDate: true, status: true, version: true, createdAt: true, updatedAt: true,
  _count: { select: { tasks: true } },
} as const;
type MilestoneRow = Prisma.ProjectMilestoneGetPayload<{ select: typeof select }>;

function serialize(row: MilestoneRow): Milestone {
  return {
    id: row.id, projectId: row.projectId, title: row.title, status: row.status,
    dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null, version: row.version,
    taskCount: row._count.tasks, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

async function visibleProject(transaction: Prisma.TransactionClient | ReturnType<typeof getDatabase>, actor: AppUser, projectId: string) {
  const project = await transaction.project.findUnique({
    where: { id: projectId },
    select: { id: true, archivedAt: true, members: { where: { userId: actor.id }, select: { userId: true } } },
  });
  if (!project || (actor.role !== "OWNER" && !project.members.length)) throw new DomainError(404, "PROJECT_NOT_FOUND", "Project not found.");
  return project;
}

function asDate(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function listProjectMilestones(actor: AppUser, projectId: string): Promise<Milestone[]> {
  const db = getDatabase();
  await visibleProject(db, actor, projectId);
  return (await db.projectMilestone.findMany({ where: { projectId }, select, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }] })).map(serialize);
}

export async function createProjectMilestone(actor: AppUser, projectId: string, input: CreateMilestoneInput): Promise<Milestone> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const project = await visibleProject(transaction, actor, projectId);
    if (project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing milestones.");
    const milestone = await transaction.projectMilestone.create({ data: { projectId, title: input.title, dueDate: asDate(input.dueDate), status: input.status }, select });
    await appendActivity(transaction, { projectId, actorId: actor.id, action: "MILESTONE_CREATED", details: { status: milestone.status } });
    return serialize(milestone);
  }, { maxWait: 5000, timeout: 10000 });
}

export async function editProjectMilestone(actor: AppUser, milestoneId: string, input: UpdateMilestoneInput): Promise<Milestone> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const milestone = await transaction.projectMilestone.findUnique({ where: { id: milestoneId }, select: { id: true, projectId: true, version: true, project: { select: { archivedAt: true } } } });
    if (!milestone) throw new DomainError(404, "MILESTONE_NOT_FOUND", "Milestone not found.");
    if (milestone.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing milestones.");
    if (milestone.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This milestone changed. Refresh before trying again.");
    const result = await transaction.projectMilestone.updateMany({
      where: { id: milestone.id, version: input.expectedVersion },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.dueDate !== undefined ? { dueDate: asDate(input.dueDate) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new DomainError(409, "STALE_VERSION", "This milestone changed. Refresh before trying again.");
    const updated = await transaction.projectMilestone.findUniqueOrThrow({ where: { id: milestone.id }, select });
    const changedFields = Object.keys(input).filter((field) => field !== "expectedVersion").sort().join(",");
    await appendActivity(transaction, { projectId: milestone.projectId, actorId: actor.id, action: "MILESTONE_UPDATED", details: { changedFields } });
    return serialize(updated);
  }, { maxWait: 5000, timeout: 10000 });
}

export async function removeProjectMilestone(actor: AppUser, milestoneId: string, input: DeleteMilestoneInput): Promise<void> {
  const db = getDatabase();
  await db.$transaction(async (transaction) => {
    const milestone = await transaction.projectMilestone.findUnique({ where: { id: milestoneId }, select: { id: true, projectId: true, version: true, project: { select: { archivedAt: true } }, _count: { select: { tasks: true } } } });
    if (!milestone) throw new DomainError(404, "MILESTONE_NOT_FOUND", "Milestone not found.");
    if (milestone.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing milestones.");
    if (milestone.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This milestone changed. Refresh before trying again.");
    if (milestone._count.tasks) throw new DomainError(409, "MILESTONE_HAS_TASKS", "Unlink every task before deleting this milestone.");
    const result = await transaction.projectMilestone.deleteMany({ where: { id: milestone.id, version: input.expectedVersion } });
    if (result.count !== 1) throw new DomainError(409, "STALE_VERSION", "This milestone changed. Refresh before trying again.");
    await appendActivity(transaction, { projectId: milestone.projectId, actorId: actor.id, action: "MILESTONE_DELETED" });
  }, { maxWait: 5000, timeout: 10000 });
}

export async function linkTaskToMilestone(actor: AppUser, taskId: string, input: LinkTaskMilestoneInput): Promise<TaskMilestoneLink> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const task = await transaction.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, version: true, deletedAt: true, project: { select: { archivedAt: true } } } });
    if (!task || task.deletedAt) throw new DomainError(404, "TASK_NOT_FOUND", "Task not found.");
    if (task.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing tasks.");
    if (task.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This task changed. Refresh before trying again.");
    const milestone = await transaction.projectMilestone.findUnique({ where: { id: input.milestoneId }, select: { id: true, projectId: true } });
    if (!milestone) throw new DomainError(404, "MILESTONE_NOT_FOUND", "Milestone not found.");
    if (milestone.projectId !== task.projectId) throw new DomainError(422, "MILESTONE_PROJECT_MISMATCH", "Choose a milestone in the same project.");
    const result = await transaction.task.updateMany({ where: { id: task.id, version: input.expectedVersion, deletedAt: null }, data: { milestoneId: milestone.id, version: { increment: 1 } } });
    if (result.count !== 1) throw new DomainError(409, "STALE_VERSION", "This task changed. Refresh before trying again.");
    const updated = await transaction.task.findUniqueOrThrow({ where: { id: task.id }, select: { id: true, milestoneId: true, version: true } });
    await appendActivity(transaction, { projectId: task.projectId, taskId: task.id, actorId: actor.id, action: "TASK_MILESTONE_LINKED", details: { milestoneId: milestone.id } });
    return { taskId: updated.id, milestoneId: updated.milestoneId, version: updated.version };
  }, { maxWait: 5000, timeout: 10000 });
}

export async function unlinkTaskFromMilestone(actor: AppUser, taskId: string, input: UnlinkTaskMilestoneInput): Promise<TaskMilestoneLink> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const task = await transaction.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, milestoneId: true, version: true, project: { select: { archivedAt: true } } } });
    if (!task) throw new DomainError(404, "TASK_NOT_FOUND", "Task not found.");
    if (task.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing tasks.");
    if (task.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This task changed. Refresh before trying again.");
    if (!task.milestoneId) throw new DomainError(409, "TASK_NOT_LINKED", "This task is not linked to a milestone.");
    const previousMilestoneId = task.milestoneId;
    const result = await transaction.task.updateMany({ where: { id: task.id, version: input.expectedVersion }, data: { milestoneId: null, version: { increment: 1 } } });
    if (result.count !== 1) throw new DomainError(409, "STALE_VERSION", "This task changed. Refresh before trying again.");
    const updated = await transaction.task.findUniqueOrThrow({ where: { id: task.id }, select: { id: true, milestoneId: true, version: true } });
    await appendActivity(transaction, { projectId: task.projectId, taskId: task.id, actorId: actor.id, action: "TASK_MILESTONE_UNLINKED", details: { milestoneId: previousMilestoneId } });
    return { taskId: updated.id, milestoneId: updated.milestoneId, version: updated.version };
  }, { maxWait: 5000, timeout: 10000 });
}
