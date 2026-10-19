import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, test } from "node:test";
import pg from "pg";
import { getDatabase } from "../server/database.ts";
import { createClient } from "../modules/clients/service.ts";
import { createProject } from "../modules/projects/service.ts";
import { DomainError } from "../server/errors.ts";

const configuredTest = process.env.TEST_DATABASE_URL;
if (!configuredTest || !process.env.DATABASE_URL) throw new Error("Configure separate development/test databases.");
const testUrl = new URL(configuredTest);
const developmentUrl = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(testUrl.hostname) || !testUrl.pathname.endsWith('_test') || testUrl.pathname === developmentUrl.pathname) {
  throw new Error("Integration tests require a separate local database ending in _test.");
}
process.env.DATABASE_URL = configuredTest;
const sql = new pg.Client({ connectionString: configuredTest, connectionTimeoutMillis: 5000 });
const ids: string[] = [];
const db = getDatabase();
const require = createRequire(import.meta.url);

before(async () => {
  const cli = path.join(path.dirname(require.resolve("prisma/package.json")), "build/index.js");
  execFileSync(process.execPath, [cli, "migrate", "deploy"], {
    env: { ...process.env, MIGRATION_DATABASE_URL: configuredTest }, stdio: "inherit",
  });
  await sql.connect();
});
after(async () => {
  // Delete only fixture IDs created by this run; never truncate shared tables.
  try {
    await db.project.deleteMany({ where: { clientId: { in: ids } } });
    await db.client.deleteMany({ where: { id: { in: ids } } });
  } finally { await db.$disconnect(); await sql.end(); }
});
async function fixture(name = `Integration ${randomUUID()}`) {
  const client = await createClient({ name, email: "fake@example.test", notes: "private fake fixture" });
  ids.push(client.id); return client;
}
async function projectCount() { return Number((await sql.query("SELECT count(*) FROM projects")).rows[0].count); }

test("real client service persists a safe DTO with database version/timestamps", async () => {
  assert.equal((await db.$queryRaw<{ TimeZone: string }[]>`SHOW TIMEZONE`)[0].TimeZone, "UTC");
  const client = await fixture();
  const result = await sql.query("SELECT name, version, archived_at, created_at FROM clients WHERE id=$1", [client.id]);
  assert.equal(result.rows[0].name, client.name); assert.equal(result.rows[0].version, 1);
  assert.equal(result.rows[0].archived_at, null);
  assert.equal(result.rows[0].created_at.toISOString(), client.createdAt);
  assert.equal(Object.hasOwn(client, "archivedAt"), false);
});
test("invalid client/project service input does not change database counts", async () => {
  const client = await fixture();
  const clientsBefore = await db.client.count(); const projectsBefore = await db.project.count();
  await assert.rejects(createClient({ name: "  " }));
  await assert.rejects(createClient({ name: "Bad", role: "OWNER" }));
  await assert.rejects(createClient({ name: "Fake\u0000Name" }));
  await assert.rejects(createClient({ name: "Fake\ud800Name" }));
  await assert.rejects(createProject({ clientId: client.id, name: "Bad", dueDate: "2026-02-29" }));
  await assert.rejects(createProject({ clientId: client.id, name: "Bad", status: "DONE" }));
  await assert.rejects(createProject({ clientId: client.id, name: "Valid", description: "Fake\u0000Notes" }));
  assert.equal(await db.client.count(), clientsBefore); assert.equal(await db.project.count(), projectsBefore);
});
test("real project creation returns joined client identity without private fields", async () => {
  const client = await fixture();
  const before = Date.now();
  const project = await createProject({ clientId: client.id, name: " Joined Project ", status: "ACTIVE" });
  assert.ok(Date.parse(project.createdAt) >= before && Date.parse(project.createdAt) <= Date.now());
  assert.equal((await sql.query("SELECT created_at FROM projects WHERE id=$1", [project.id])).rows[0].created_at.toISOString(), project.createdAt);
  assert.equal(project.name, "Joined Project"); assert.equal(project.version, 1);
  assert.equal(project.dueDate, null); assert.equal(project.description, null);
  assert.deepEqual(project.client, { id: client.id, name: client.name });
  assert.equal(JSON.stringify(project).includes("private fake fixture"), false);
  assert.deepEqual(Object.keys(project.client).sort(), ["id", "name"]);
});
test("foreign key rejects an orphan even when bypassing application validation", async () => {
  const before = await projectCount();
  await assert.rejects(sql.query("INSERT INTO projects(client_id,name,updated_at) VALUES($1,$2,now())", [randomUUID(), "Orphan"]), { code: "23503" });
  assert.equal(await projectCount(), before);
});
test("restrictive deletion preserves a client that owns a project", async () => {
  const client = await fixture(); const project = await createProject({ clientId: client.id, name: "Retained" });
  await assert.rejects(sql.query("DELETE FROM clients WHERE id=$1", [client.id]), { code: "23503" });
  assert.ok(await db.client.findUnique({ where: { id: client.id } }));
  assert.ok(await db.project.findUnique({ where: { id: project.id } }));
});
test("database primary keys reject duplicate client IDs", async () => {
  const client = await fixture();
  await assert.rejects(sql.query("INSERT INTO clients(id,name,updated_at) VALUES($1,$2,now())", [client.id, "Duplicate"]), { code: "23505" });
});
test("database checks reject blank names and nonpositive versions", async () => {
  const before = await db.client.count();
  await assert.rejects(sql.query("INSERT INTO clients(name,updated_at) VALUES($1,now())", [" \t\n "]), { code: "23514" });
  await assert.rejects(sql.query("INSERT INTO clients(name,version,updated_at) VALUES('Bad version',0,now())"), { code: "23514" });
  assert.equal(await db.client.count(), before);
});
test("database enum and text length reject invalid direct project inserts", async () => {
  const client = await fixture(); const before = await projectCount();
  await assert.rejects(sql.query("INSERT INTO projects(client_id,name,status,updated_at) VALUES($1,'Bad','DONE',now())", [client.id]), { code: "22P02" });
  await assert.rejects(sql.query("INSERT INTO projects(client_id,name,updated_at) VALUES($1,$2,now())", [client.id, "😀".repeat(121)]), { code: "22001" });
  assert.equal(await projectCount(), before);
});
test("archived client is rejected under the transaction lock without a project write", async () => {
  const client = await fixture(); await db.client.update({ where: { id: client.id }, data: { archivedAt: new Date() } });
  const before = await projectCount();
  await assert.rejects(createProject({ clientId: client.id, name: "Blocked" }), (error) => error instanceof DomainError && error.status === 409);
  assert.equal(await projectCount(), before);
});
test("missing client is rejected without an orphan project", async () => {
  const before = await projectCount();
  await assert.rejects(createProject({ clientId: randomUUID(), name: "Missing" }), (error) => error instanceof DomainError && error.status === 404);
  assert.equal(await projectCount(), before);
});
test("concurrent project creations for one client preserve every unique ID", async () => {
  const client = await fixture();
  const projects = await Promise.all(Array.from({ length: 12 }, (_, index) => createProject({ clientId: client.id, name: `Parallel ${index}` })));
  assert.equal(new Set(projects.map((project) => project.id)).size, 12);
  assert.equal(await db.project.count({ where: { clientId: client.id } }), 12);
});
test("date-only values round-trip at year and leap-day boundaries", async () => {
  const client = await fixture();
  for (const dueDate of ["0001-01-01", "2028-02-29", "9999-12-31"]) {
    const project = await createProject({ clientId: client.id, name: "Date boundary", dueDate });
    assert.equal(project.dueDate, dueDate);
    assert.equal((await sql.query("SELECT due_date::text FROM projects WHERE id=$1", [project.id])).rows[0].due_date, dueDate);
  }
});
test("parameterized SQL join matches the project and client IDs", async () => {
  const client = await fixture(); const project = await createProject({ clientId: client.id, name: "Join example" });
  const rows = (await sql.query("SELECT p.id, p.name AS project_name, c.name AS client_name FROM projects p JOIN clients c ON c.id=p.client_id WHERE p.id=$1", [project.id])).rows;
  assert.deepEqual(rows, [{ id: project.id, project_name: project.name, client_name: client.name }]);
});
test("runtime account cannot create tables, read migrations or connect to test DB", async () => {
  const runtime = new pg.Client({ connectionString: developmentUrl.toString(), connectionTimeoutMillis: 5000 });
  try {
    await runtime.connect();
    const privileges = (await runtime.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS ddl, has_table_privilege(current_user,'public._prisma_migrations','SELECT') AS migrations")).rows[0];
    assert.deepEqual(privileges, { ddl: false, migrations: false });
    await assert.rejects(runtime.query("SELECT id FROM _prisma_migrations LIMIT 1"), { code: "42501" });
  } finally { await runtime.end(); }
  const forbidden = new URL(developmentUrl); forbidden.pathname = testUrl.pathname;
  const cross = new pg.Client({ connectionString: forbidden.toString(), connectionTimeoutMillis: 5000 });
  try { await assert.rejects(cross.connect(), { code: "42501" }); } finally { await cross.end(); }
});
