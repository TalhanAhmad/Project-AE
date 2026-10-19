import type { ProjectStatus } from "../../types/domain.ts";

export type Project = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string };
};
