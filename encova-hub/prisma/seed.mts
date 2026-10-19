import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { seedClients, seedProjects } from "./seed-data.ts";

const connectionString = process.env.MIGRATION_DATABASE_URL;
if (!connectionString) throw new Error("MIGRATION_DATABASE_URL is required for the explicit seed command.");
const target = new URL(connectionString);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !/^\/encova_(hub|hub_test|recreate_[a-f0-9]+)$/.test(target.pathname)) {
  throw new Error("Seed is restricted to the documented local development/test/recreation databases.");
}
const database = new PrismaClient({ adapter: new PrismaPg({ connectionString, options: "-c timezone=UTC", connectionTimeoutMillis: 5000 }) });
try {
  await database.$transaction(async (transaction) => {
    for (const record of seedClients) {
      await transaction.client.upsert({ where: { id: record.id }, create: { ...record }, update: { ...record } });
    }
    for (const record of seedProjects) {
      await transaction.project.upsert({ where: { id: record.id }, create: { ...record }, update: { ...record } });
    }
  });
  console.log("Seeded 2 synthetic clients and 3 projects by fixed IDs. Repeating does not duplicate them.");
} catch {
  throw new Error("Synthetic seed failed; check local migrations and the seed account permissions.");
} finally { await database.$disconnect(); }
