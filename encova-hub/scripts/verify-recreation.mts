import "dotenv/config";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// This command uses only the cluster created by our optional Windows helper.
// No configured development/test database is ever dropped or reset.
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const credentialsPath = path.resolve(appRoot, "../.local/postgres/credentials.json");
const credentials = JSON.parse(readFileSync(credentialsPath, "utf8")) as { admin: string; test: string };
const databaseName = `encova_recreate_${randomUUID().replaceAll("-", "")}`;
assert.match(databaseName, /^encova_recreate_[a-f0-9]{32}$/);
const admin = new pg.Client({ host: "127.0.0.1", port: 55432, database: "postgres", user: "encova_admin", password: credentials.admin, connectionTimeoutMillis: 5000 });
const freshUrl = new URL(`postgresql://encova_test@127.0.0.1:55432/${databaseName}`);
freshUrl.password = credentials.test;
const environment = { ...process.env, DATABASE_URL: freshUrl.toString(), MIGRATION_DATABASE_URL: freshUrl.toString() };
const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve("prisma/package.json")), "build/index.js");
let created = false;
let fresh: pg.Client | undefined;
try {
  await admin.connect();
  // The quoted identifier contains only our generated fixed prefix and hex UUID.
  await admin.query(`CREATE DATABASE "${databaseName}" OWNER encova_test`);
  created = true;
  await admin.query(`REVOKE CONNECT ON DATABASE "${databaseName}" FROM PUBLIC`);
  await admin.query(`GRANT CONNECT ON DATABASE "${databaseName}" TO encova_test`);
  execFileSync(process.execPath, [cli, "migrate", "deploy"], { env: environment, cwd: appRoot, stdio: "inherit" });
  execFileSync(process.execPath, [path.join(appRoot, "prisma/seed.mts")], { env: environment, cwd: appRoot, stdio: "inherit" });
  execFileSync(process.execPath, [path.join(appRoot, "prisma/seed.mts")], { env: environment, cwd: appRoot, stdio: "inherit" });
  fresh = new pg.Client({ connectionString: freshUrl.toString(), connectionTimeoutMillis: 5000 });
  await fresh.connect();
  assert.equal((await fresh.query("SELECT count(*)::int AS count FROM clients")).rows[0].count, 2);
  assert.equal((await fresh.query("SELECT count(*)::int AS count FROM projects")).rows[0].count, 3);
  const joined = await fresh.query("SELECT p.name AS project_name, c.name AS client_name FROM projects p JOIN clients c ON c.id=p.client_id ORDER BY p.id");
  assert.deepEqual(joined.rows, [
    { project_name: "Demo website", client_name: "Example Studio" },
    { project_name: "Demo brand refresh", client_name: "Example Studio" },
    { project_name: "Demo catalogue", client_name: "Sample Workshop" },
  ]);
  assert.equal((await fresh.query("SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")).rows[0].count, 1);
  console.log("Fresh database recreation passed: migration, seed twice, exactly 2 clients/3 projects and matching SQL join.");
} finally {
  await fresh?.end();
  if (created) {
    // Only drop the unique scratch database successfully created by this run.
    assert.match(databaseName, /^encova_recreate_[a-f0-9]{32}$/);
    await admin.query(`DROP DATABASE "${databaseName}"`);
    console.log("Removed only this run's temporary recreation database.");
  }
  await admin.end();
}
