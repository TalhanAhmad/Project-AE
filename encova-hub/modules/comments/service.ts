import "server-only";
import type { AppUser } from "../auth/types.ts";
import { createCommentSchema } from "./schemas.ts";
import { createTaskComment, listTaskComments } from "./queries.ts";
export function listComments(actor: AppUser, taskId: string) { return listTaskComments(actor, taskId); }
export function createComment(actor: AppUser, taskId: string, input: unknown) { return createTaskComment(actor, taskId, createCommentSchema.parse(input)); }
