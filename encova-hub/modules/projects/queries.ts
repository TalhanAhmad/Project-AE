import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";
import { DomainError } from "../../server/errors.ts";
import type { CreateProjectInput } from "./schemas.ts";
import type { Project } from "./types.ts";

const select = {
  id: true, clientId: true, name: true, description: true, status: true,
  dueDate: true, version: true, createdAt: true, updatedAt: true,
  // A project's response never includes client email/company/private notes.
  client: { select: { id: true, name: true } },
} as const;
type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof select }>;

function serialize(row: ProjectRow): Project {
  return {
    id: row.id, clientId: row.clientId, name: row.name, description: row.description,
    status: row.status, dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
    version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    client: { id: row.client.id, name: row.client.name },
  };
}

export type ProjectRepository = {
  list(): Promise<Project[]>;
  create(input: CreateProjectInput): Promise<Project>;
};

export const projectRepository: ProjectRepository = {
  async list() {
    return (await getDatabase().project.findMany({ select, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })).map(serialize);
  },
  async create(input) {
    return getDatabase().$transaction(async (transaction) => {
      // Lock the client first, matching the architecture's future archive rule.
      // Tagged SQL binds the ID as a value, never as SQL text.
      const clients = await transaction.$queryRaw<{ id: string; archived_at: Date | null }[]>(Prisma.sql`
        SELECT id, archived_at FROM clients WHERE id = ${input.clientId}::uuid FOR UPDATE
      `);
      if (!clients.length) throw new DomainError(404, "CLIENT_NOT_FOUND", "Choose an existing client.");
      if (clients[0].archived_at) throw new DomainError(409, "CLIENT_ARCHIVED", "Choose an active client.");
      return serialize(await transaction.project.create({
        data: {
          clientId: input.clientId, name: input.name, description: input.description,
          status: input.status, dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
        },
        select,
      }));
    }, { maxWait: 5000, timeout: 10000 });
  },
};
