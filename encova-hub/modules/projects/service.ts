import "server-only";
import { createProjectSchema } from "./schemas.ts";
import { projectRepository, type ProjectRepository } from "./queries.ts";
import type { Project } from "./types.ts";

export function listProjects(repository: ProjectRepository = projectRepository): Promise<Project[]> {
  return repository.list();
}

export async function createProject(input: unknown, repository: ProjectRepository = projectRepository): Promise<Project> {
  const data = createProjectSchema.parse(input);
  return repository.create(data);
}
