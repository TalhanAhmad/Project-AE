import "server-only";
import { randomUUID } from "node:crypto";
import { createClientSchema } from "./schemas.ts";
import { clientStore, type ClientStore } from "./store.ts";
import type { Client } from "./types.ts";

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

export async function listClients(store: ClientStore = clientStore): Promise<Client[]> {
  return store.list().map(toClientDto);
}

export async function createClient(
  input: unknown,
  store: ClientStore = clientStore,
): Promise<Client> {
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

  return toClientDto(store.insert(client));
}
