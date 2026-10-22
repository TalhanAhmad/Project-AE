import "server-only";
import type { AppUser } from "../auth/types.ts";
import { createCommentSchema, deleteCommentSchema, updateCommentSchema } from "./schemas.ts";
import { createTaskComment, listTaskComments, softDeleteComment, updateComment } from "./queries.ts";
export function listComments(actor: AppUser, taskId: string) { return listTaskComments(actor, taskId); }
export function createComment(actor: AppUser, taskId: string, input: unknown) { return createTaskComment(actor, taskId, createCommentSchema.parse(input)); }
export function editComment(actor: AppUser, commentId: string, input: unknown) { return updateComment(actor, commentId, updateCommentSchema.parse(input)); }
export function deleteComment(actor: AppUser, commentId: string, input: unknown) { return softDeleteComment(actor, commentId, deleteCommentSchema.parse(input)); }
