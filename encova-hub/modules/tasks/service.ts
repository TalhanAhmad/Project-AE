import "server-only";
import { requireOwner } from "../auth/service.ts";
import type { AppUser } from "../auth/types.ts";
import { createTaskSchema, deleteTaskSchema, taskListQuerySchema, taskStatusSchema, updateTaskSchema } from "./schemas.ts";
import { createProjectTask, editTask, listProjectTasks, listWorkspaceTasks, softDeleteTask, updateTaskStatus } from "./queries.ts";

export function listTasks(actor: AppUser, projectId: string) { return listProjectTasks(actor, projectId); }
export function listWorkspace(actor: AppUser, query: unknown) { return listWorkspaceTasks(actor, taskListQuerySchema.parse(query)); }
export async function createTask(actor: AppUser, projectId: string, input: unknown) { requireOwner(actor); return createProjectTask(actor, projectId, createTaskSchema.parse(input)); }
export function changeTaskStatus(actor: AppUser, taskId: string, input: unknown) { return updateTaskStatus(actor, taskId, taskStatusSchema.parse(input)); }
export async function deleteTask(actor: AppUser, taskId: string, input: unknown) { requireOwner(actor); return softDeleteTask(actor, taskId, deleteTaskSchema.parse(input)); }
export async function updateTask(actor: AppUser, taskId: string, input: unknown) { requireOwner(actor); return editTask(actor, taskId, updateTaskSchema.parse(input)); }
