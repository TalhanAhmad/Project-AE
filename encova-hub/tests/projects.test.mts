import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { ZodError } from "zod";
import { GET, POST } from "../app/api/projects/route.ts";
import { projectRepository } from "../modules/projects/queries.ts";
import { createProject } from "../modules/projects/service.ts";
import { createProjectSchema, type CreateProjectInput } from "../modules/projects/schemas.ts";
import type { Project } from "../modules/projects/types.ts";
import { DomainError } from "../server/errors.ts";

const clientId = randomUUID();
const record: Project = {
  id: randomUUID(), clientId, name: "Example Project", status: "PLANNED",
  description: null, dueDate: null, version: 1,
  createdAt: "2026-10-18T12:00:00.000Z", updatedAt: "2026-10-18T12:00:00.000Z",
  client: { id: clientId, name: "Example Client" },
};
function request(body: string, headers: HeadersInit = {}) {
  return new Request("http://127.0.0.1:3000/api/projects", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body,
  });
}

test("project validation trims text and defaults to PLANNED", () => {
  assert.deepEqual(createProjectSchema.parse({ clientId, name: " Example ", description: " Notes " }), {
    clientId, name: "Example", description: "Notes", status: "PLANNED",
  });
});
test("project validation accepts 120 Unicode code points and real leap days", () => {
  assert.equal(createProjectSchema.parse({ clientId, name: "😀".repeat(120), dueDate: "2028-02-29" }).dueDate, "2028-02-29");
});

const invalid: [string, unknown][] = [
  ["null character in name", { clientId, name: "Fake\u0000Name" }],
  ["null character in description", { clientId, name: "Valid", description: "Fake\u0000Description" }],
  ["unpaired surrogate", { clientId, name: "Fake\ud800Name" }],
  ["missing client", { name: "Example" }],
  ["bad client UUID", { clientId: "1 OR 1=1", name: "Example" }],
  ["missing name", { clientId }],
  ["blank name", { clientId, name: " \t\n " }],
  ["oversized Unicode name", { clientId, name: "😀".repeat(121) }],
  ["numeric name", { clientId, name: 42 }],
  ["invalid status", { clientId, name: "Example", status: "DONE" }],
  ["invalid leap day", { clientId, name: "Example", dueDate: "2026-02-29" }],
  ["invalid month", { clientId, name: "Example", dueDate: "2026-13-01" }],
  ["timestamp instead of date", { clientId, name: "Example", dueDate: "2026-10-18T00:00:00Z" }],
  ["year zero", { clientId, name: "Example", dueDate: "0000-01-01" }],
  ["null date", { clientId, name: "Example", dueDate: null }],
  ["long description", { clientId, name: "Example", description: "a".repeat(5001) }],
  ["unknown private field", { clientId, name: "Example", privateCredentialProbe: "fake" }],
  ["browser ID", { clientId, name: "Example", id: randomUUID() }],
  ["browser version", { clientId, name: "Example", version: 12 }],
  ["array body", []],
  ["null body", null],
];
for (const [label, value] of invalid) {
  test(`invalid ${label} never calls project storage`, async () => {
    let writes = 0;
    await assert.rejects(createProject(value, {
      list: async () => [],
      create: async () => { writes++; return record; },
    }), ZodError);
    assert.equal(writes, 0);
  });
}
test("valid service input reaches the repository as explicit parsed data", async () => {
  let received: CreateProjectInput | undefined;
  const output = await createProject({ clientId, name: " Trim Me " }, {
    list: async () => [], create: async (value) => { received = value; return record; },
  });
  assert.deepEqual(received, { clientId, name: "Trim Me", status: "PLANNED" });
  assert.deepEqual(output, record);
});
test("project GET returns uncached JSON including empty lists", async (context) => {
  context.mock.method(projectRepository, "list", async () => []);
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { data: [] });
});
test("project POST returns 201 with the created DTO", async (context) => {
  context.mock.method(projectRepository, "create", async () => record);
  const response = await POST(request(JSON.stringify({ clientId, name: record.name })));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { data: record });
});
test("project POST rejects malformed JSON, unknown fields, media and origins without storage", async (context) => {
  let writes = 0;
  context.mock.method(projectRepository, "create", async () => { writes++; return record; });
  const cases: [Request, number][] = [
    [request("{"), 400],
    [request(JSON.stringify({ clientId, name: "Valid", privateCredentialProbe: "fake" })), 422],
    [request(JSON.stringify({ clientId, name: "Valid" }), { "Content-Type": "text/plain" }), 415],
    [request(JSON.stringify({ clientId, name: "Valid" }), { Origin: "https://unrelated.example.test" }), 403],
  ];
  for (const [input, status] of cases) {
    const response = await POST(input);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(JSON.stringify(await response.json()).includes("privateCredentialProbe"), false);
  }
  assert.equal(writes, 0);
});
test("missing and archived clients produce safe domain errors", async (context) => {
  for (const [status, code] of [[404, "CLIENT_NOT_FOUND"], [409, "CLIENT_ARCHIVED"]] as const) {
    context.mock.method(projectRepository, "create", async () => { throw new DomainError(status, code, "Choose an available client."); });
    const response = await POST(request(JSON.stringify({ clientId, name: "Valid" })));
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
});
test("unexpected project failures have safe JSON, unique IDs and sanitized logs", async (context) => {
  const logs: unknown[][] = [];
  context.mock.method(console, "error", (...args: unknown[]) => logs.push(args));
  context.mock.method(projectRepository, "list", async () => { throw new Error("fake-private-db-url"); });
  context.mock.method(projectRepository, "create", async () => { throw new Error("fake-private-db-url"); });
  const get = await GET();
  const post = await POST(request(JSON.stringify({ clientId, name: "Valid" })));
  for (const response of [get, post]) {
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = await response.json();
    assert.equal(body.error.requestId, response.headers.get("X-Request-Id"));
    assert.equal(JSON.stringify(body).includes("fake-private"), false);
  }
  assert.notEqual(get.headers.get("X-Request-Id"), post.headers.get("X-Request-Id"));
  assert.equal(JSON.stringify(logs).includes("fake-private"), false);
  assert.equal(logs.length, 2);
});
