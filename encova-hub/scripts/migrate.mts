import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import pg from "pg";
import { requireVerifiedRemoteTls } from "../modules/shared/database-url.ts";

const migrationUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const applicationUrl = process.env.DATABASE_URL;
if (!migrationUrl || !applicationUrl) throw new Error("Configure migration and application database URLs.");
const verifiedMigrationUrl = requireVerifiedRemoteTls(migrationUrl);
const migration = new URL(verifiedMigrationUrl);
const application = new URL(requireVerifiedRemoteTls(applicationUrl));
// Neon uses a direct hostname for migrations and a -pooler hostname at runtime.
// They are the same database endpoint after the pooler marker is removed.
const databaseHost = (url: URL) => url.hostname.replace("-pooler.", ".");
if (databaseHost(migration) !== databaseHost(application) || migration.pathname !== application.pathname) {
  throw new Error("Migration and application URLs must address the same database.");
}
const usesManagedSingleAccount = migration.username === application.username;
if (!process.env.MIGRATION_DATABASE_URL) process.env.MIGRATION_DATABASE_URL = verifiedMigrationUrl;

const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve("prisma/package.json")), "build/index.js");
execFileSync(process.execPath, [cli, "migrate", "deploy"], { stdio: "inherit" });
const connection = new pg.Client({ connectionString: verifiedMigrationUrl, connectionTimeoutMillis: 5000 });
try {
  await connection.connect();
  if (usesManagedSingleAccount) {
    console.log("Migrations applied with the managed database account; runtime and migration credentials are provider-managed.");
    process.exitCode = 0;
  } else {
  // Quote the configured identifier; never interpolate unquoted SQL identifiers.
  const role = '"' + decodeURIComponent(application.username).replaceAll('"', '""') + '"';
  await connection.query(`REVOKE ALL ON TABLE public._prisma_migrations FROM ${role}`);
  await connection.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await connection.query(`GRANT SELECT, INSERT ON TABLE public.clients, public.projects TO ${role}`);
  // The app resolves active roles from the database on every request and may
  // add an idempotent project membership. It still receives no schema rights.
  await connection.query(`GRANT SELECT ON TABLE public.users, public.credential_identities, public.project_members TO ${role}`);
  await connection.query(`GRANT INSERT, UPDATE ON TABLE public.project_members TO ${role}`);
  await connection.query(`GRANT SELECT, INSERT, UPDATE ON TABLE public.tasks, public.comments TO ${role}`);
  // Milestones are owner-managed project data. The database still enforces
  // project pairing and restrictive deletes; this grant only enables the
  // validated runtime service to perform its allowed operations.
  await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_milestones TO ${role}`);
  // Activity is append-only through application code: the runtime can read and insert it, never alter history.
  await connection.query(`GRANT SELECT, INSERT ON TABLE public.activity_logs TO ${role}`);
  // PostgreSQL requires UPDATE privilege for SELECT ... FOR UPDATE client locks.
  await connection.query(`GRANT UPDATE ON TABLE public.clients TO ${role}`);
  console.log("Migrations applied; runtime has data access/client-lock privileges, no schema or migration-history access.");
  }
} catch {
  throw new Error("Database privilege setup failed; check the migration account permissions.");
} finally {
  await connection.end();
}
