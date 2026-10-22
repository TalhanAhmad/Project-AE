import "server-only";
import { requireOwner } from "../auth/service.ts";
import type { AppUser } from "../auth/types.ts";
import { createTaskSchema, taskStatusSchema } from "./schemas.ts";
import { createProjectTask, listProjectTasks, updateTaskStatus } from "./queries.ts";

export function listTasks(actor: AppUser, projectId: string) { return listProjectTasks(actor, projectId); }
export async function createTask(actor: AppUser, projectId: string, input: unknown) { requireOwner(actor); return createProjectTask(actor, projectId, createTaskSchema.parse(input)); }
export function changeTaskStatus(actor: AppUser, taskId: string, input: unknown) { return updateTaskStatus(actor, taskId, taskStatusSchema.parse(input)); }
