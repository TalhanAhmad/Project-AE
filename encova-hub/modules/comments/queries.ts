import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import type { AppUser } from "../auth/types.ts";
import type { CreateCommentInput, DeleteCommentInput, UpdateCommentInput } from "./schemas.ts";
import type { Comment } from "./types.ts";

const select = { id: true, taskId: true, body: true, deletedAt: true, version: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } } } as const;
type CommentRow = Prisma.CommentGetPayload<{ select: typeof select }>;
function serialize(row: CommentRow): Comment { return { ...row, body: row.deletedAt ? null : row.body, deletedAt: row.deletedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }

async function readableTask(actor: AppUser, taskId: string) {
  const task = await getDatabase().task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, deletedAt: true, project: { select: { archivedAt: true, members: { where: { userId: actor.id }, select: { userId: true } } } } } });
  if (!task || task.deletedAt || (actor.role !== "OWNER" && !task.project.members.length)) throw new DomainError(404, "TASK_NOT_FOUND", "Task not found.");
  return task;
}

export async function listTaskComments(actor: AppUser, taskId: string): Promise<Comment[]> {
  await readableTask(actor, taskId);
  return (await getDatabase().comment.findMany({ where: { taskId }, select, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })).map(serialize);
}

export async function createTaskComment(actor: AppUser, taskId: string, input: CreateCommentInput): Promise<Comment> {
  const task = await readableTask(actor, taskId);
  if (task.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before adding comments.");
  return serialize(await getDatabase().comment.create({ data: { taskId, authorId: actor.id, body: input.body }, select }));
}

async function editableComment(actor: AppUser, commentId: string) {
  const comment = await getDatabase().comment.findUnique({ where: { id: commentId }, select: { id: true, authorId: true, version: true, deletedAt: true, task: { select: { id: true, deletedAt: true, project: { select: { archivedAt: true, members: { where: { userId: actor.id }, select: { userId: true } } } } } } } });
  if (!comment || comment.deletedAt || comment.task.deletedAt || (actor.role !== "OWNER" && !comment.task.project.members.length)) throw new DomainError(404, "COMMENT_NOT_FOUND", "Comment not found.");
  if (comment.task.project.archivedAt) throw new DomainError(409, "PROJECT_ARCHIVED", "Restore the project before changing comments.");
  if (comment.authorId !== actor.id) throw new DomainError(403, "FORBIDDEN", "Only the author can change this comment.");
  return comment;
}

export async function updateComment(actor: AppUser, commentId: string, input: UpdateCommentInput): Promise<Comment> {
  const comment = await editableComment(actor, commentId);
  if (comment.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This comment changed. Refresh before trying again.");
  return serialize(await getDatabase().comment.update({ where: { id: comment.id }, data: { body: input.body, version: { increment: 1 } }, select }));
}

export async function softDeleteComment(actor: AppUser, commentId: string, input: DeleteCommentInput): Promise<void> {
  const comment = await editableComment(actor, commentId);
  if (comment.version !== input.expectedVersion) throw new DomainError(409, "STALE_VERSION", "This comment changed. Refresh before trying again.");
  await getDatabase().comment.update({ where: { id: comment.id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
}
