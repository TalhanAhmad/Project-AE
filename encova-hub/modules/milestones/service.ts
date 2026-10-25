import "server-only";
import { requireOwner } from "../auth/service.ts";
import type { AppUser } from "../auth/types.ts";
import { createMilestoneSchema, deleteMilestoneSchema, linkTaskMilestoneSchema, unlinkTaskMilestoneSchema, updateMilestoneSchema } from "./schemas.ts";
import { createProjectMilestone, editProjectMilestone, linkTaskToMilestone, listProjectMilestones, removeProjectMilestone, unlinkTaskFromMilestone } from "./queries.ts";

export function listMilestones(actor: AppUser, projectId: string) { return listProjectMilestones(actor, projectId); }
export async function createMilestone(actor: AppUser, projectId: string, input: unknown) { requireOwner(actor); return createProjectMilestone(actor, projectId, createMilestoneSchema.parse(input)); }
export async function updateMilestone(actor: AppUser, milestoneId: string, input: unknown) { requireOwner(actor); return editProjectMilestone(actor, milestoneId, updateMilestoneSchema.parse(input)); }
export async function deleteMilestone(actor: AppUser, milestoneId: string, input: unknown) { requireOwner(actor); return removeProjectMilestone(actor, milestoneId, deleteMilestoneSchema.parse(input)); }
export async function linkTaskMilestone(actor: AppUser, taskId: string, input: unknown) { requireOwner(actor); return linkTaskToMilestone(actor, taskId, linkTaskMilestoneSchema.parse(input)); }
export async function unlinkTaskMilestone(actor: AppUser, taskId: string, input: unknown) { requireOwner(actor); return unlinkTaskFromMilestone(actor, taskId, unlinkTaskMilestoneSchema.parse(input)); }
