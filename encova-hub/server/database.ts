import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { requireVerifiedRemoteTls } from "../modules/shared/database-url.ts";

// Lazy construction keeps builds and isolated unit tests independent of a DB.
// One client/pool is reused across development module reloads.
const databaseGlobal = globalThis as typeof globalThis & { encovaDatabase?: PrismaClient };

export function getDatabase(): PrismaClient {
  if (!databaseGlobal.encovaDatabase) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required for database access.");
    const adapter = new PrismaPg({
      connectionString: requireVerifiedRemoteTls(connectionString),
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      statement_timeout: 10000,
      // The installed adapter formats timestamps as UTC without an offset.
      // Every pooled session must interpret those values in UTC too.
      options: "-c timezone=UTC",
    });
    databaseGlobal.encovaDatabase = new PrismaClient({
      adapter,
      // Error boundaries emit sanitized events; do not log query parameters/URLs.
      log: [],
    });
  }
  return databaseGlobal.encovaDatabase;
}
