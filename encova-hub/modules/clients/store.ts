import "server-only";
import type { Client } from "./types.ts";

export type ClientStore = {
  list(): Client[];
};

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
  };
}

export const clientStore = createClientStore();
