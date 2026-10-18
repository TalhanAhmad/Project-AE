import "server-only";
import { clientStore, type ClientStore } from "./store.ts";
import type { Client } from "./types.ts";

export async function listClients(store: ClientStore = clientStore): Promise<Client[]> {
  return store.list().map((client) => ({
    // Explicit fields keep future internal storage fields out of the API.
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    notes: client.notes,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  }));
}
