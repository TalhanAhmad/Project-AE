import "server-only";
import type { Client } from "./types.ts";

export type ClientStore = {
  list(): Client[];
  insert(client: Client): Client;
};

// Historical Week 1 fake store for isolated tests only. The application now uses
// PostgreSQL through queries.ts; it never falls back to this temporary store.
// Local practice only: every server process has its own disposable memory.
// The optional initial records let tests use fake data without an HTTP reset
// or seed endpoint. The application's store starts empty.
export function createClientStore(initialClients: readonly Client[] = []): ClientStore {
  const clients = initialClients.map((client) => ({ ...client }));

  return {
    list() {
      // Callers receive copies so reading cannot accidentally change storage.
      return clients.map((client) => ({ ...client }));
    },
    insert(client) {
      const stored = { ...client };
      clients.push(stored);
      return { ...stored };
    },
  };
}

export const clientStore = createClientStore();
