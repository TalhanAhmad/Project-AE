import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import type { AppUser } from "../auth/types.ts";
import type { CreateCommentInput } from "./schemas.ts";
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
