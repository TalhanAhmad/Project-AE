import "server-only";
import { randomUUID } from "node:crypto";
import { createClientSchema } from "./schemas.ts";
import { clientRepository, type ClientRepository } from "./queries.ts";
import type { Client } from "./types.ts";
import { requireOwner } from "../auth/service.ts";
import type { AppUser } from "../auth/types.ts";

function toClientDto(client: Client): Client {
  return {
    // Explicit fields keep future internal storage fields out of the API.
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    notes: client.notes,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export async function listClients(actor: AppUser, store: ClientRepository = clientRepository): Promise<Client[]> {
  requireOwner(actor);
  return (await store.list()).map(toClientDto);
}

export async function createClient(
  actor: AppUser,
  input: unknown,
  store: ClientRepository = clientRepository,
): Promise<Client> {
  requireOwner(actor);
  // Validate at the service boundary so every caller follows the same rules.
  // No ID, timestamp, or browser-supplied object is passed straight to storage.
  const data = createClientSchema.parse(input);
  const now = new Date().toISOString();
  const client: Client = {
    id: randomUUID(),
    name: data.name,
    email: data.email,
    company: data.company,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  return toClientDto(await store.insert(client));
}
