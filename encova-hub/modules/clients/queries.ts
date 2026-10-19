import "server-only";
import { getDatabase } from "../../server/database.ts";
import type { Client } from "./types.ts";

// The synchronous variant lets isolated unit tests use the existing fake store.
export type ClientRepository = {
  list(): Client[] | Promise<Client[]>;
  insert(client: Client): Client | Promise<Client>;
};

const select = {
  id: true, name: true, email: true, company: true, notes: true,
  createdAt: true, updatedAt: true,
} as const;

type ClientRow = {
  id: string; name: string; email: string | null; company: string | null;
  notes: string | null; createdAt: Date; updatedAt: Date;
};

function serialize(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    ...(row.email === null ? {} : { email: row.email }),
    ...(row.company === null ? {} : { company: row.company }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const clientRepository: ClientRepository = {
  async list() {
    const rows = await getDatabase().client.findMany({
      select,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map(serialize);
  },
  async insert(client) {
    const row = await getDatabase().client.create({
      data: {
        id: client.id, name: client.name, email: client.email,
        company: client.company, notes: client.notes,
        createdAt: new Date(client.createdAt), updatedAt: new Date(client.updatedAt),
      },
      select,
    });
    return serialize(row);
  },
};
