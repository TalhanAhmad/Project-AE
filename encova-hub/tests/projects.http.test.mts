import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, test } from "node:test";

const base = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("Local HTTP server required.");
const endpoint = new URL("/api/projects", base);
let clientId: string;
const clientName = `HTTP client ${randomUUID()}`;
const privateNotes = `private-fake-notes-${randomUUID()}`;
async function post(body: unknown, headers: Record<string, string> = {}) {
  return fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Origin: base.origin, ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
}
async function list() {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  return (await response.json()).data as { id: string; createdAt: string; name: string }[];
}
before(async () => {
  const response = await fetch(new URL("/api/clients", base), {
    method: "POST", headers: { "Content-Type": "application/json", Origin: base.origin },
    body: JSON.stringify({ name: clientName, email: "private@example.test", notes: privateNotes }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 201);
  clientId = (await response.json()).data.id;
});

test("project list is uncached JSON with standard security headers", async () => {
  const response = await fetch(endpoint);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("X-Powered-By"), null);
  assert.ok(Array.isArray((await response.json()).data));
});
test("project creation links the client and preserves a date-only due date", async () => {
  const before = Date.now();
  const response = await post({ clientId, name: "  HTTP Project  ", description: "  Fake description  ", status: "ACTIVE", dueDate: "2028-02-29" });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const { data } = await response.json();
  assert.equal(data.name, "HTTP Project"); assert.equal(data.description, "Fake description");
  assert.equal(data.status, "ACTIVE"); assert.equal(data.dueDate, "2028-02-29");
  assert.equal(data.clientId, clientId); assert.equal(data.version, 1);
  assert.deepEqual(data.client, { id: clientId, name: clientName });
  assert.match(data.id, /^[0-9a-f-]{36}$/);
  assert.equal(new Date(data.createdAt).toISOString(), data.createdAt);
  assert.ok(Date.parse(data.createdAt) >= before && Date.parse(data.createdAt) <= Date.now());
  assert.ok((await list()).some((item) => item.id === data.id));
  assert.equal(JSON.stringify(data).includes(privateNotes), false);
  assert.deepEqual(Object.keys(data).sort(), ["id", "clientId", "name", "description", "status", "dueDate", "version", "createdAt", "updatedAt", "client"].sort());
});
test("omitted project fields have explicit defaults and nulls", async () => {
  const response = await post({ clientId, name: "Minimal project" });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.status, "PLANNED"); assert.equal(data.description, null); assert.equal(data.dueDate, null);
});
test("invalid projects never change the persistent project list", async () => {
  const before = await list();
  for (const input of [
    { clientId, name: "Fake\u0000Name" },
    { clientId, name: "Valid", description: "Fake\ud800Description" },
    { clientId, name: "  " }, { clientId, name: "😀".repeat(121) },
    { clientId, name: "Bad date", dueDate: "2026-02-29" },
    { clientId, name: "Bad status", status: "DONE" },
    { clientId: "not-a-uuid", name: "Bad client" },
    { clientId, name: "Unknown field", version: 30 },
  ]) assert.equal((await post(input)).status, 422);
  assert.deepEqual(await list(), before);
});
test("missing client gives 404 without inserting an orphan", async () => {
  const before = await list();
  const response = await post({ clientId: randomUUID(), name: "No client" });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "CLIENT_NOT_FOUND");
  assert.deepEqual(await list(), before);
});
test("project origin, media and byte-limit rejections do not write", async () => {
  const before = await list();
  assert.equal((await post({ clientId, name: "Wrong origin" }, { Origin: "https://unrelated.example.test" })).status, 403);
  assert.equal((await post({ clientId, name: "Wrong media" }, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await post({ clientId, name: "Too large", description: "a".repeat(33000) })).status, 413);
  assert.deepEqual(await list(), before);
});
test("malformed project JSON returns 400", async () => {
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Origin: base.origin }, body: "{" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "INVALID_JSON");
});
test("SQL-like project names stay plain stored text", async () => {
  const name = "Fake'); DROP TABLE clients; --";
  const response = await post({ clientId, name }); assert.equal(response.status, 201);
  assert.equal((await response.json()).data.name, name);
  assert.ok((await list()).some((item) => item.name === name));
});
test("concurrent projects for one client keep unique records", async () => {
  const responses = await Promise.all(Array.from({ length: 8 }, (_, index) => post({ clientId, name: `Concurrent fake ${index}` })));
  assert.ok(responses.every((response) => response.status === 201));
  const records = await Promise.all(responses.map(async (response) => (await response.json()).data));
  assert.equal(new Set(records.map((record) => record.id)).size, 8);
  const ids = new Set((await list()).map((record) => record.id));
  assert.ok(records.every((record) => ids.has(record.id)));
});
test("project ordering is deterministic by newest timestamp then UUID", async () => {
  const rows = await list();
  const sorted = [...rows].sort((a, b) => a.createdAt === b.createdAt ? b.id.localeCompare(a.id) : b.createdAt.localeCompare(a.createdAt));
  assert.deepEqual(rows, sorted);
});
test("project edits/deletes remain unsupported in Week 2", async () => {
  for (const method of ["PUT", "PATCH", "DELETE"]) assert.equal((await fetch(endpoint, { method })).status, 405);
});
