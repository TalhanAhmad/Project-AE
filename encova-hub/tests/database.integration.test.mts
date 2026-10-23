import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, test } from "node:test";
import pg from "pg";
import { getDatabase } from "../server/database.ts";
import { createClient as createClientForUser } from "../modules/clients/service.ts";
import { createProject as createProjectForUser } from "../modules/projects/service.ts";
import { listClients } from "../modules/clients/service.ts";
import { listProjects } from "../modules/projects/service.ts";
import { addMember, listMembers } from "../modules/memberships/service.ts";
import { resolveActiveUser } from "../modules/auth/service.ts";
import { changeTaskStatus, createTask, deleteTask, listTasks, updateTask } from "../modules/tasks/service.ts";
import { createComment, deleteComment, editComment, listComments } from "../modules/comments/service.ts";
import { DomainError } from "../server/errors.ts";
import { Prisma } from "../generated/prisma/client.ts";
import type { AppUser } from "../modules/auth/types.ts";

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
const userIds: string[] = [];
const owner: AppUser = { id: randomUUID(), authSubject: "test:owner", email: "owner@example.test", name: "Test Owner", role: "OWNER" };
const createClient = (input: unknown) => createClientForUser(owner, input);
const createProject = (input: unknown) => createProjectForUser(owner, input);
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
    await db.activityLog.deleteMany({ where: { actorId: { in: userIds } } });
    await db.comment.deleteMany({ where: { authorId: { in: userIds } } });
    await db.task.deleteMany({ where: { OR: [{ assigneeId: { in: userIds } }, { createdById: { in: userIds } }] } });
    await db.projectMember.deleteMany({ where: { userId: { in: userIds } } });
    await db.credentialIdentity.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.project.deleteMany({ where: { clientId: { in: ids } } });
    await db.client.deleteMany({ where: { id: { in: ids } } });
  } finally { await db.$disconnect(); await sql.end(); }
});
async function fixture(name = `Integration ${randomUUID()}`) {
  const client = await createClient({ name, email: "fake@example.test", notes: "private fake fixture" });
  ids.push(client.id); return client;
}
async function projectCount() { return Number((await sql.query("SELECT count(*) FROM projects")).rows[0].count); }
async function userFixture(role: "OWNER" | "MEMBER" = "MEMBER") {
  const suffix = randomUUID();
  const user = await db.user.create({
    data: { authSubject: `test:${suffix}`, email: `user-${suffix}@example.test`, name: `Test ${role}`, role, isActive: true },
  });
  userIds.push(user.id);
  return user;
}

test("active linked identities resolve while unlinked and inactive identities are denied", async () => {
  const user = await userFixture();
  assert.equal((await resolveActiveUser(user.authSubject)).id, user.id);
  await assert.rejects(resolveActiveUser(`test:missing-${randomUUID()}`), (error) => error instanceof DomainError && error.status === 403);
  await db.user.update({ where: { id: user.id }, data: { isActive: false } });
  await assert.rejects(resolveActiveUser(user.authSubject), (error) => error instanceof DomainError && error.status === 403);
});

test("membership scopes project reads and owners alone can access client contacts or add members", async () => {
  const client = await fixture();
  const visible = await createProject({ clientId: client.id, name: "Visible to member" });
  const hidden = await createProject({ clientId: client.id, name: "Hidden from member" });
  const memberRecord = await userFixture("MEMBER");
  const member: AppUser = { id: memberRecord.id, authSubject: memberRecord.authSubject, email: memberRecord.email, name: memberRecord.name, role: "MEMBER" };

  const membership = await addMember(owner, visible.id, { userId: member.id });
  assert.equal(membership.userId, member.id);
  assert.deepEqual(await addMember(owner, visible.id, { userId: member.id }), membership);
  assert.deepEqual((await listMembers(owner, visible.id)).map((entry) => entry.userId), [member.id]);
  assert.deepEqual((await listProjects(member)).map((project) => project.id), [visible.id]);
  assert.equal((await listProjects(member)).some((project) => project.id === hidden.id), false);
  await assert.rejects(listClients(member), (error) => error instanceof DomainError && error.status === 403);
  await assert.rejects(createProjectForUser(member, { clientId: client.id, name: "Member write" }), (error) => error instanceof DomainError && error.status === 403);
  await assert.rejects(addMember(member, visible.id, { userId: member.id }), (error) => error instanceof DomainError && error.status === 403);
});

test("owners create project tasks while members can update assigned work and comment only on visible work", async () => {
  const client = await fixture();
  const project = await createProject({ clientId: client.id, name: "Task project" });
  const ownerRecord = await userFixture("OWNER");
  const taskOwner: AppUser = { id: ownerRecord.id, authSubject: ownerRecord.authSubject, email: ownerRecord.email, name: ownerRecord.name, role: "OWNER" };
  const memberRecord = await userFixture("MEMBER");
  const member: AppUser = { id: memberRecord.id, authSubject: memberRecord.authSubject, email: memberRecord.email, name: memberRecord.name, role: "MEMBER" };
  const outsiderRecord = await userFixture("MEMBER");
  const outsider: AppUser = { id: outsiderRecord.id, authSubject: outsiderRecord.authSubject, email: outsiderRecord.email, name: outsiderRecord.name, role: "MEMBER" };
  await addMember(owner, project.id, { userId: member.id });
  const task = await createTask(taskOwner, project.id, { title: " Assigned task ", assigneeId: member.id, priority: "HIGH", dueDate: "2026-10-30" });
  assert.equal(task.title, "Assigned task"); assert.equal(task.assignee?.id, member.id); assert.equal(task.version, 1);
  assert.equal((await listTasks(member, project.id))[0]?.id, task.id);
  await assert.rejects(listTasks(outsider, project.id), (error) => error instanceof DomainError && error.status === 404);
  await assert.rejects(createTask(member, project.id, { title: "Nope" }), (error) => error instanceof DomainError && error.status === 403);
  await assert.rejects(createTask(taskOwner, project.id, { title: "Bad assignment", assigneeId: outsider.id }), (error) => error instanceof DomainError && error.status === 422);
  const updated = await changeTaskStatus(member, task.id, { status: "IN_PROGRESS", expectedVersion: task.version });
  assert.equal(updated.status, "IN_PROGRESS"); assert.equal(updated.version, 2);
  const editedTask = await updateTask(taskOwner, task.id, { title: "Edited task", expectedVersion: updated.version });
  assert.equal(editedTask.title, "Edited task"); assert.equal(editedTask.version, 3);
  await assert.rejects(changeTaskStatus(outsider, task.id, { status: "DONE", expectedVersion: updated.version }), (error) => error instanceof DomainError && error.status === 404);
  const comment = await createComment(member, task.id, { body: "I started this." });
  assert.equal(comment.author.id, member.id);
  const editedComment = await editComment(member, comment.id, { body: "Work is in progress.", expectedVersion: comment.version });
  assert.equal(editedComment.body, "Work is in progress."); assert.equal(editedComment.version, 2);
  await assert.rejects(editComment(taskOwner, comment.id, { body: "Owner cannot replace this.", expectedVersion: editedComment.version }), (error) => error instanceof DomainError && error.status === 403);
  await deleteComment(member, comment.id, { expectedVersion: editedComment.version });
  assert.deepEqual((await listComments(taskOwner, task.id)).map((entry) => entry.body), [null]);
  await assert.rejects(createComment(outsider, task.id, { body: "Hidden" }), (error) => error instanceof DomainError && error.status === 404);
  await deleteTask(taskOwner, task.id, { expectedVersion: editedTask.version });
  assert.deepEqual(await listTasks(member, project.id), []);
  const actions = await db.activityLog.findMany({ where: { taskId: task.id }, select: { action: true, details: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  assert.deepEqual(actions.map((entry) => entry.action), ["TASK_CREATED", "TASK_STATUS_CHANGED", "TASK_UPDATED", "COMMENT_CREATED", "COMMENT_UPDATED", "COMMENT_DELETED", "TASK_DELETED"]);
  assert.deepEqual(actions[1]?.details, { fromStatus: "TODO", toStatus: "IN_PROGRESS" });
  assert.equal(JSON.stringify(actions).includes("I started this."), false);
  assert.equal(JSON.stringify(actions).includes("Work is in progress."), false);
});

test("activity records keep a task paired with its own project", async () => {
  const client = await fixture();
  const project = await createProject({ clientId: client.id, name: "Activity project" });
  const otherProject = await createProject({ clientId: client.id, name: "Other activity project" });
  const actorRecord = await userFixture("OWNER");
  const actor: AppUser = { id: actorRecord.id, authSubject: actorRecord.authSubject, email: actorRecord.email, name: actorRecord.name, role: "OWNER" };
  const task = await createTask(actor, project.id, { title: "Tracked task" });

  const record = await db.activityLog.create({ data: { projectId: project.id, taskId: task.id, actorId: actor.id, action: "TASK_UPDATED", details: { changedFields: "priority" } } });
  assert.equal(record.projectId, project.id);
  await assert.rejects(
    db.activityLog.create({ data: { projectId: otherProject.id, taskId: task.id, actorId: actor.id, action: "TASK_UPDATED", details: {} } }),
    (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003",
  );
  assert.equal(await db.activityLog.count({ where: { actorId: actor.id, action: "TASK_UPDATED" } }), 1);
});

test("an activity-insert failure rolls back the task mutation", async () => {
  const client = await fixture();
  const project = await createProject({ clientId: client.id, name: "Atomic activity project" });
  const ownerRecord = await userFixture("OWNER");
  const taskOwner: AppUser = { id: ownerRecord.id, authSubject: ownerRecord.authSubject, email: ownerRecord.email, name: ownerRecord.name, role: "OWNER" };
  const task = await createTask(taskOwner, project.id, { title: "Must not partially update" });
  // This actor deliberately has no database row. The task update starts, but
  // its required activity row violates the actor foreign key and must roll back.
  const missingActor: AppUser = { id: randomUUID(), authSubject: "test:missing", email: "missing@example.test", name: "Missing actor", role: "OWNER" };

  await assert.rejects(changeTaskStatus(missingActor, task.id, { status: "DONE", expectedVersion: task.version }), (error) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003");
  const unchanged = await db.task.findUniqueOrThrow({ where: { id: task.id }, select: { status: true, version: true } });
  assert.deepEqual(unchanged, { status: "TODO", version: 1 });
});

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
