import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import { appendActivity } from "../activity/queries.ts";
import type { AppUser } from "../auth/types.ts";
import type { CreateTaskInput, DeleteTaskInput, TaskStatusInput, UpdateTaskInput } from "./schemas.ts";
import type { Task } from "./types.ts";

const select = {
  id: true, projectId: true, title: true, description: true, status: true, priority: true, dueDate: true,
  version: true, createdAt: true, updatedAt: true,
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;
type TaskRow = Prisma.TaskGetPayload<{ select: typeof select }>;

function serialize(row: TaskRow): Task {
  return { ...row, dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

async function visibleProject(transaction: ReturnType<typeof getDatabase>, actor: AppUser, projectId: string) {
  const project = await transaction.project.findUnique({ where: { id: projectId }, select: { id: true, archivedAt: true, members: { where: { userId: actor.id }, select: { userId: true } } } });
  if (!project || (actor.role !== "OWNER" && !project.members.length)) throw new DomainError(404, "PROJECT_NOT_FOUND", "Project not found.");
  return project;
}

export async function listProjectTasks(actor: AppUser, projectId: string): Promise<Task[]> {
  const db = getDatabase();
  await visibleProject(db, actor, projectId);
  return (await db.task.findMany({ where: { projectId, deletedAt: null }, select, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })).map(serialize);
}

export async function createProjectTask(actor: AppUser, projectId: string, input: CreateTaskInput): Promise<Task> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const project = await visibleProject(transaction as ReturnType<typeof getDatabase>, actor, projectId);
    if (project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before adding tasks.");
    if (input.assigneeId) {
      const assignee = await transaction.user.findUnique({ where: { id: input.assigneeId }, select: { isActive: true, memberships: { where: { projectId }, select: { userId: true } } } });
      if (!assignee || !assignee.isActive || !assignee.memberships.length) throw new DomainError(422, "INVALID_ASSIGNEE", "Choose an active member of this project.");
    }
    const task = await transaction.task.create({ data: { projectId, title: input.title, description: input.description, priority: input.priority, assigneeId: input.assigneeId ?? null, dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null, createdById: actor.id }, select });
    await appendActivity(transaction, { projectId, taskId: task.id, actorId: actor.id, action: "TASK_CREATED", details: { status: task.status, priority: task.priority, assigneeId: task.assignee?.id ?? null } });
    return serialize(task);
  }, { maxWait: 5000, timeout: 10000 });
}

export async function updateTaskStatus(actor: AppUser, taskId: string, input: TaskStatusInput): Promise<Task> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const task = await transaction.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, assigneeId: true, status: true, version: true, deletedAt: true } });
    if (!task || task.deletedAt) throw new DomainError(404, "TASK_NOT_FOUND", "Task not found.");
    const project = await visibleProject(transaction as ReturnType<typeof getDatabase>, actor, task.projectId);
    if (project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing tasks.");
    if (actor.role !== "OWNER" && task.assigneeId !== actor.id) throw new DomainError(403, "FORBIDDEN", "Only the assignee can change this task.");
    if (task.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This task changed. Refresh before trying again.");
    const updated = await transaction.task.update({ where: { id: task.id }, data: { status: input.status, version: { increment: 1 } }, select });
    await appendActivity(transaction, { projectId: task.projectId, taskId: task.id, actorId: actor.id, action: "TASK_STATUS_CHANGED", details: { fromStatus: task.status, toStatus: updated.status } });
    return serialize(updated);
  }, { maxWait: 5000, timeout: 10000 });
}

export async function softDeleteTask(actor: AppUser, taskId: string, input: DeleteTaskInput): Promise<void> {
  const db = getDatabase();
  await db.$transaction(async (transaction) => {
    const task = await transaction.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, version: true, deletedAt: true } });
    if (!task || task.deletedAt) throw new DomainError(404, "TASK_NOT_FOUND", "Task not found.");
    const project = await visibleProject(transaction as ReturnType<typeof getDatabase>, actor, task.projectId);
    if (project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing tasks.");
    if (actor.role !== "OWNER") throw new DomainError(403, "FORBIDDEN", "Only an owner can delete tasks.");
    if (task.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This task changed. Refresh before trying again.");
    await transaction.task.update({ where: { id: task.id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    await appendActivity(transaction, { projectId: task.projectId, taskId: task.id, actorId: actor.id, action: "TASK_DELETED" });
  }, { maxWait: 5000, timeout: 10000 });
}

export async function editTask(actor: AppUser, taskId: string, input: UpdateTaskInput): Promise<Task> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const task = await transaction.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, version: true, deletedAt: true } });
    if (!task || task.deletedAt) throw new DomainError(404, "TASK_NOT_FOUND", "Task not found.");
    const project = await visibleProject(transaction as ReturnType<typeof getDatabase>, actor, task.projectId);
    if (project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing tasks.");
    if (actor.role !== "OWNER") throw new DomainError(403, "FORBIDDEN", "Only an owner can edit tasks.");
    if (task.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This task changed. Refresh before trying again.");
    if (input.assigneeId) {
      const assignee = await transaction.user.findUnique({ where: { id: input.assigneeId }, select: { isActive: true, memberships: { where: { projectId: task.projectId }, select: { userId: true } } } });
      if (!assignee || !assignee.isActive || !assignee.memberships.length) throw new DomainError(422, "INVALID_ASSIGNEE", "Choose an active member of this project.");
    }
    const updated = await transaction.task.update({ where: { id: task.id }, data: { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.priority !== undefined ? { priority: input.priority } : {}), ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}), ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null } : {}), version: { increment: 1 } }, select });
    const changedFields = Object.keys(input).filter((field) => field !== "expectedVersion").sort().join(",");
    await appendActivity(transaction, { projectId: task.projectId, taskId: task.id, actorId: actor.id, action: "TASK_UPDATED", details: { changedFields } });
    return serialize(updated);
  }, { maxWait: 5000, timeout: 10000 });
}
