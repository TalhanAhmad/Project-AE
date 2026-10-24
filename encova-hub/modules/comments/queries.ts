import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import { appendActivity } from "../activity/queries.ts";
import type { AppUser } from "../auth/types.ts";
import type { CreateCommentInput, DeleteCommentInput, UpdateCommentInput } from "./schemas.ts";
import type { Comment } from "./types.ts";

const select = { id: true, taskId: true, body: true, deletedAt: true, version: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } } } as const;
type CommentRow = Prisma.CommentGetPayload<{ select: typeof select }>;
function serialize(row: CommentRow): Comment { return { ...row, body: row.deletedAt ? null : row.body, deletedAt: row.deletedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }

async function readableTask(transaction: Prisma.TransactionClient | ReturnType<typeof getDatabase>, actor: AppUser, taskId: string) {
  const task = await transaction.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, deletedAt: true, project: { select: { archivedAt: true, members: { where: { userId: actor.id }, select: { userId: true } } } } } });
  if (!task || task.deletedAt || (actor.role !== "OWNER" && !task.project.members.length)) throw new DomainError(404, "TASK_NOT_FOUND", "Task not found.");
  return task;
}

export async function listTaskComments(actor: AppUser, taskId: string): Promise<Comment[]> {
  const db = getDatabase();
  await readableTask(db, actor, taskId);
  return (await db.comment.findMany({ where: { taskId }, select, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })).map(serialize);
}

export async function createTaskComment(actor: AppUser, taskId: string, input: CreateCommentInput): Promise<Comment> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const task = await readableTask(transaction, actor, taskId);
    if (task.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before adding comments.");
    const comment = await transaction.comment.create({ data: { taskId, authorId: actor.id, body: input.body }, select });
    await appendActivity(transaction, { projectId: task.projectId, taskId, actorId: actor.id, action: "COMMENT_CREATED" });
    return serialize(comment);
  }, { maxWait: 5000, timeout: 10000 });
}

async function editableComment(transaction: Prisma.TransactionClient, actor: AppUser, commentId: string) {
  const comment = await transaction.comment.findUnique({ where: { id: commentId }, select: { id: true, authorId: true, version: true, deletedAt: true, task: { select: { id: true, projectId: true, deletedAt: true, project: { select: { archivedAt: true, members: { where: { userId: actor.id }, select: { userId: true } } } } } } } });
  if (!comment || comment.deletedAt || comment.task.deletedAt || (actor.role !== "OWNER" && !comment.task.project.members.length)) throw new DomainError(404, "COMMENT_NOT_FOUND", "Comment not found.");
  if (comment.task.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing comments.");
  if (comment.authorId !== actor.id) throw new DomainError(403, "FORBIDDEN", "Only the author can change this comment.");
  return comment;
}

export async function updateComment(actor: AppUser, commentId: string, input: UpdateCommentInput): Promise<Comment> {
  const db = getDatabase();
  return db.$transaction(async (transaction) => {
    const comment = await editableComment(transaction, actor, commentId);
    if (comment.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This comment changed. Refresh before trying again.");
    const result = await transaction.comment.updateMany({ where: { id: comment.id, version: input.expectedVersion, deletedAt: null }, data: { body: input.body, version: { increment: 1 } } });
    if (result.count !== 1) throw new DomainError(409, "STALE_VERSION", "This comment changed. Refresh before trying again.");
    const updated = await transaction.comment.findUniqueOrThrow({ where: { id: comment.id }, select });
    await appendActivity(transaction, { projectId: comment.task.projectId, taskId: comment.task.id, actorId: actor.id, action: "COMMENT_UPDATED" });
    return serialize(updated);
  }, { maxWait: 5000, timeout: 10000 });
}

export async function softDeleteComment(actor: AppUser, commentId: string, input: DeleteCommentInput): Promise<void> {
  const db = getDatabase();
  await db.$transaction(async (transaction) => {
    const comment = await editableComment(transaction, actor, commentId);
    if (comment.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This comment changed. Refresh before trying again.");
    const result = await transaction.comment.updateMany({ where: { id: comment.id, version: input.expectedVersion, deletedAt: null }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    if (result.count !== 1) throw new DomainError(409, "STALE_VERSION", "This comment changed. Refresh before trying again.");
    await appendActivity(transaction, { projectId: comment.task.projectId, taskId: comment.task.id, actorId: actor.id, action: "COMMENT_DELETED" });
  }, { maxWait: 5000, timeout: 10000 });
}
