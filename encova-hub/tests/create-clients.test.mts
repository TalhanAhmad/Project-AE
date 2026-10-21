import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { ZodError } from "zod";
import { GET, POST } from "../app/api/clients/route.ts";
import { createClient } from "../modules/clients/service.ts";
import { createClientStore } from "../modules/clients/store.ts";
import { clientRepository as clientStore } from "../modules/clients/queries.ts";
import type { Client } from "../modules/clients/types.ts";
import type { AppUser } from "../modules/auth/types.ts";
import { currentUserResolver } from "../server/current-user.ts";
import { MAX_JSON_BODY_BYTES } from "../server/http.ts";

const endpoint = "http://127.0.0.1:3000/api/clients";
const uuid = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/;
const owner: AppUser = { id: "550e8400-e29b-41d4-a716-446655440001", authSubject: "test:owner", email: "owner@example.test", name: "Test Owner", role: "OWNER" };
mock.method(currentUserResolver, "get", async () => owner);
const ownedClient = (input: unknown, store = createClientStore()) => createClient(owner, input, store);

function request(body: string, headers: HeadersInit = {}): Request {
  return new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

test("createClient trims input and generates UUID and UTC timestamps", async () => {
  const store = createClientStore();
  const before = Date.now();
  const client = await ownedClient({
    name: "  Example Client  ",
    email: " client@example.test ",
    company: " Example Agency ",
    notes: " Fake notes ",
  }, store);
  assert.match(client.id, uuid);
  assert.equal(client.name, "Example Client");
  assert.equal(client.email, "client@example.test");
  assert.equal(client.company, "Example Agency");
  assert.equal(client.notes, "Fake notes");
  assert.equal(client.createdAt, client.updatedAt);
  assert.equal(new Date(client.createdAt).toISOString(), client.createdAt);
  assert.ok(Date.parse(client.createdAt) >= before && Date.parse(client.createdAt) <= Date.now());
  assert.equal(store.list().length, 1);
});

test("creation supports omitted optional fields and returns isolated copies", async () => {
  const store = createClientStore();
  const result = await ownedClient({ name: "Only name" }, store);
  assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(result))).sort(), [
    "createdAt", "id", "name", "updatedAt",
  ]);
  result.name = "Changed return value";
  assert.equal(store.list()[0].name, "Only name");
});

test("the 120-character boundary accepts names after trimming", async () => {
  const result = await ownedClient({ name: ` ${"a".repeat(120)} ` });
  assert.equal(result.name.length, 120);
});

test("Unicode names use the installed Zod character rules", async () => {
  const result = await ownedClient({ name: "😀".repeat(120) });
  assert.equal(Array.from(result.name).length, 120);
  await assert.rejects(
    ownedClient({ name: "😀".repeat(121) }),
    ZodError,
  );
});

const invalidInputs: [string, unknown][] = [
  ["null character in name", { name: "Fake\u0000Name" }],
  ["null character in company", { name: "Valid", company: "Fake\u0000Company" }],
  ["null character in notes", { name: "Valid", notes: "Fake\u0000Notes" }],
  ["unpaired surrogate", { name: "Fake\ud800Name" }],
  ["missing name", {}],
  ["blank name", { name: " \t\n " }],
  ["long name", { name: "a".repeat(121) }],
  ["numeric name", { name: 42 }],
  ["invalid email", { name: "Example", email: "not-an-email" }],
  ["blank email", { name: "Example", email: "" }],
  ["null email", { name: "Example", email: null }],
  ["numeric company", { name: "Example", company: 42 }],
  ["long company", { name: "Example", company: "a".repeat(121) }],
  ["long notes", { name: "Example", notes: "a".repeat(5001) }],
  ["null notes", { name: "Example", notes: null }],
  ["unknown role", { name: "Example", role: "OWNER" }],
  ["supplied ID", { name: "Example", id: "browser-id" }],
  ["supplied timestamp", { name: "Example", createdAt: "2000-01-01T00:00:00.000Z" }],
  ["prototype key", JSON.parse('{"name":"Example","__proto__":{"admin":true}}')],
  ["array", [{ name: "Example" }]],
  ["null body", null],
  ["string body", "Example"],
];

for (const [label, input] of invalidInputs) {
  test(`invalid ${label} never changes storage`, async () => {
    const store = createClientStore();
    await assert.rejects(ownedClient(input, store), ZodError);
    assert.deepEqual(store.list(), []);
  });
}

test("POST 201 is visible through GET in the same store", async (context) => {
  const store = createClientStore();
  context.mock.method(clientStore, "insert", (client: Client) => store.insert(client));
  context.mock.method(clientStore, "list", () => store.list());
  const response = await POST(request('{"name":"  Posted Client  "}'));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const { data } = await response.json();
  assert.equal(data.name, "Posted Client");
  assert.match(data.id, uuid);
  assert.deepEqual(await (await GET()).json(), { data: [data] });
});

test("malformed or empty JSON returns 400 without writing", async (context) => {
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  for (const body of ["", "{", '{"name":}', '{"name":"Example",}']) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_JSON");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(writes, 0);
});

test("invalid fields return 422 with useful allowlisted field errors", async (context) => {
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  for (const [, input] of invalidInputs) {
    const response = await POST(request(JSON.stringify(input)));
    assert.equal(response.status, 422);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.ok(Object.keys(body.error.fields).length > 0);
    assert.ok(Object.keys(body.error.fields).every((key) => ["name", "email", "company", "notes", "_form"].includes(key)));
  }
  assert.equal(writes, 0);
});

test("request origin, content type, and declared size are checked before writing", async (context) => {
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  const cases: [HeadersInit, number][] = [
    [{ Origin: "https://unrelated.example.test" }, 403],
    [{ Origin: "null" }, 403],
    [{ "Sec-Fetch-Site": "cross-site" }, 403],
    [{ "Content-Type": "text/plain" }, 415],
    [{ "Content-Type": "application/x-www-form-urlencoded" }, 415],
    [{ "Content-Length": String(MAX_JSON_BODY_BYTES + 1) }, 413],
    [{ "Content-Length": "invalid" }, 400],
  ];
  for (const [headers, status] of cases) {
    const response = await POST(request('{"name":"Example"}', headers));
    assert.equal(response.status, status);
  }
  const foreignHost = new Request("http://unrelated.example.test/api/clients", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: '{"name":"Example"}',
  });
  assert.equal((await POST(foreignHost)).status, 403);
  assert.equal(writes, 0);
});

test("an actual oversized body is rejected even without Content-Length", async (context) => {
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  const response = await POST(request(JSON.stringify({ name: "Example", notes: "a".repeat(MAX_JSON_BODY_BYTES) })));
  assert.equal(response.status, 413);
  assert.equal(writes, 0);
});

test("invalid UTF-8 returns 400 without writing", async (context) => {
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  const invalidUtf8 = new Request(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: new Uint8Array([0xff]),
  });
  assert.equal((await POST(invalidUtf8)).status, 400);
  assert.equal(writes, 0);
});

test("same-origin JSON with a charset is accepted", async (context) => {
  const store = createClientStore();
  context.mock.method(clientStore, "insert", (client: Client) => store.insert(client));
  const response = await POST(request('{"name":"Example"}', {
    Origin: "http://127.0.0.1:3000",
    "Sec-Fetch-Site": "same-origin",
    "Content-Type": "application/json; charset=utf-8",
  }));
  assert.equal(response.status, 201);
  assert.equal(store.list().length, 1);
});

test("write failures return a safe 500 and sanitized logs", async (context) => {
  const detail = "fake-private-write-detail";
  const entries: unknown[][] = [];
  context.mock.method(clientStore, "insert", () => { throw new Error(detail); });
  context.mock.method(console, "error", (...args: unknown[]) => entries.push(args));
  const response = await POST(request('{"name":"Example"}'));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.match(body.error.requestId, uuid);
  assert.equal(body.error.requestId, response.headers.get("X-Request-Id"));
  assert.equal(JSON.stringify(body).includes(detail), false);
  assert.equal(JSON.stringify(entries).includes(detail), false);
  assert.ok(JSON.stringify(entries).includes(body.error.requestId));
});

test("parallel creation produces distinct IDs without losing records", async () => {
  const store = createClientStore();
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    ownedClient({ name: `Fake Client ${index}` }, store),
  ));
  assert.equal(new Set(results.map((client) => client.id)).size, 12);
  assert.equal(store.list().length, 12);
});

test("streamed Unicode split across byte chunks decodes correctly", async (context) => {
  const store = createClientStore();
  context.mock.method(clientStore, "insert", (client: Client) => store.insert(client));
  const bytes = new TextEncoder().encode('{"name":"علی 😀"}');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const streamed = new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit);
  const response = await POST(streamed);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.name, "علی 😀");
});

test("stream size checks ignore a falsely small Content-Length and cancel excess data", async (context) => {
  let cancelled = false;
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(1024)); },
    cancel() { cancelled = true; },
  });
  const streamed = new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": "1" },
    body: stream,
    duplex: "half",
  } as RequestInit);
  assert.equal((await POST(streamed)).status, 413);
  assert.equal(cancelled, true);
  assert.equal(writes, 0);
});

test("loopback normalization preserves the actual browser origin", async (context) => {
  const store = createClientStore();
  context.mock.method(clientStore, "insert", (client: Client) => store.insert(client));
  const normalizedRequest = new Request("http://localhost:3000/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "127.0.0.1:3000",
      Origin: "http://127.0.0.1:3000",
    },
    body: '{"name":"Loopback client"}',
  });
  assert.equal((await POST(normalizedRequest)).status, 201);
  assert.equal(store.list().length, 1);
});

test("forged hosts and different local ports are denied", async (context) => {
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  for (const host of [
    "unrelated.example.test:3000",
    "127.0.0.1:3001",
    "127.0.0.1:99999",
    "unrelated@localhost:3000",
    "localhost:3000/path",
  ]) {
    const response = await POST(request('{"name":"Example"}', {
      Host: host,
      Origin: "http://127.0.0.1:3000",
    }));
    assert.equal(response.status, 403);
  }
  assert.equal(writes, 0);
});

test("a configured HTTPS application origin permits its exact deployment host", async (context) => {
  const originalOrigin = process.env.APP_ORIGIN;
  const store = createClientStore();
  context.mock.method(clientStore, "insert", (client: Client) => store.insert(client));
  process.env.APP_ORIGIN = "https://encova-hub.vercel.app";
  try {
    const response = await POST(new Request("https://encova-hub.vercel.app/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: "encova-hub.vercel.app",
        Origin: "https://encova-hub.vercel.app",
        "Sec-Fetch-Site": "same-origin",
      },
      body: '{"name":"Vercel client"}',
    }));
    assert.equal(response.status, 201);
    assert.equal(store.list().length, 1);
  } finally {
    if (originalOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originalOrigin;
  }
});

test("nonlocal requests require the exact configured HTTPS application origin", async (context) => {
  const originalOrigin = process.env.APP_ORIGIN;
  let writes = 0;
  context.mock.method(clientStore, "insert", () => { writes += 1; throw new Error("Unexpected write"); });
  try {
    process.env.APP_ORIGIN = "https://encova-hub.vercel.app";
    for (const requestUrl of [
      "https://unrelated.example.test/api/clients",
      "http://encova-hub.vercel.app/api/clients",
    ]) {
      const response = await POST(new Request(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: new URL(requestUrl).host,
          Origin: "https://encova-hub.vercel.app",
        },
        body: '{"name":"Denied"}',
      }));
      assert.equal(response.status, 403);
    }
    process.env.APP_ORIGIN = "http://encova-hub.vercel.app";
    const insecureConfiguration = await POST(new Request("https://encova-hub.vercel.app/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Host: "encova-hub.vercel.app", Origin: "https://encova-hub.vercel.app" },
      body: '{"name":"Denied"}',
    }));
    assert.equal(insecureConfiguration.status, 403);
    assert.equal(writes, 0);
  } finally {
    if (originalOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originalOrigin;
  }
});

test("maximum-length Unicode fields still fit the request-size limit", async (context) => {
  const store = createClientStore();
  context.mock.method(clientStore, "insert", (client: Client) => store.insert(client));
  const body = JSON.stringify({
    name: "😀".repeat(120),
    company: "😀".repeat(120),
    notes: "😀".repeat(5000),
    email: "client@example.test",
  });
  assert.ok(new TextEncoder().encode(body).byteLength <= MAX_JSON_BODY_BYTES);
  const response = await POST(request(body));
  assert.equal(response.status, 201);
  assert.equal(Array.from((await response.json()).data.notes).length, 5000);
});
