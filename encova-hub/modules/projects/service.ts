import "server-only";
import { createProjectSchema } from "./schemas.ts";
import { projectRepository, type ProjectRepository } from "./queries.ts";
import type { Project } from "./types.ts";
import { requireOwner } from "../auth/service.ts";
import type { AppUser } from "../auth/types.ts";

export function listProjects(actor: AppUser, repository: ProjectRepository = projectRepository): Promise<Project[]> {
  return actor.role === "OWNER" ? repository.list() : repository.listForMember?.(actor.id) ?? Promise.resolve([]);
}

export async function createProject(actor: AppUser, input: unknown, repository: ProjectRepository = projectRepository): Promise<Project> {
  requireOwner(actor);
  const data = createProjectSchema.parse(input);
  return repository.create(data);
}
