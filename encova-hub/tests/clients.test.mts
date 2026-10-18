import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "../app/api/clients/route.ts";
import { listClients } from "../modules/clients/service.ts";
import { clientStore, createClientStore } from "../modules/clients/store.ts";
import type { Client } from "../modules/clients/types.ts";

const client: Client = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Example Client",
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

test("a new memory store is empty", () => {
  assert.deepEqual(createClientStore().list(), []);
});

test("memory storage copies its initial records", () => {
  const input = { ...client };
  const store = createClientStore([input]);
  input.name = "Changed outside storage";
  assert.equal(store.list()[0].name, client.name);
});

test("changing a returned array or record does not change storage", () => {
  const store = createClientStore([client]);
  const result = store.list();
  result[0].name = "Changed copy";
  result.push({ ...client, name: "Another copy" });
  assert.deepEqual(store.list(), [client]);
});

test("independent stores do not share their fixture data", () => {
  assert.equal(createClientStore([client]).list().length, 1);
  assert.deepEqual(createClientStore().list(), []);
});

test("service serializes explicit fields and omits internal fields", async () => {
  const storedRecord = { ...client, internalToken: "fake-private-test-value" };
  const result = await listClients(createClientStore([storedRecord]));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [client]);
  assert.equal(Object.hasOwn(result[0], "internalToken"), false);
});

test("service preserves supplied optional client fields", async () => {
  const fullClient = {
    ...client,
    company: "Example Agency",
    email: "client@example.test",
    notes: "Fake local practice data",
  };
  assert.deepEqual(await listClients(createClientStore([fullClient])), [fullClient]);
});

test("GET returns 200, no-store, and an empty data array", async (context) => {
  const emptyStore = createClientStore();
  context.mock.method(clientStore, "list", () => emptyStore.list());
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type") ?? "", /application\/json/);
  assert.deepEqual(await response.json(), { data: [] });
});

test("GET returns populated fake data without leaking extra fields", async (context) => {
  const storedRecord = { ...client, internalToken: "fake-private-test-value" };
  const seededStore = createClientStore([storedRecord]);
  // Test-only replacement: no fake records are added to the running app.
  context.mock.method(clientStore, "list", () => seededStore.list());
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { data: [client] });
});

test("GET returns a safe, uncached JSON error when storage throws", async (context) => {
  const privateDetail = "fake-private-storage-detail";
  const logEntries: unknown[][] = [];
  context.mock.method(clientStore, "list", () => {
    throw new Error(privateDetail);
  });
  context.mock.method(console, "error", (...args: unknown[]) => logEntries.push(args));

  const response = await GET();
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type") ?? "", /application\/json/);
  const requestId = response.headers.get("X-Request-Id");
  assert.ok(requestId);
  const body = await response.json();
  assert.deepEqual(body, {
    error: {
      code: "INTERNAL_ERROR",
      message: "Unable to load clients. Please try again.",
      requestId,
    },
  });
  assert.match(body.error.requestId, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.equal(JSON.stringify(body).includes(privateDetail), false);
  assert.equal(logEntries.length, 1);
  const logged = JSON.stringify(logEntries);
  assert.ok(logged.includes(body.error.requestId));
  assert.equal(logged.includes(privateDetail), false);
  assert.equal(logged.includes("stack"), false);
});

test("separate failures receive different request IDs", async (context) => {
  context.mock.method(clientStore, "list", () => {
    throw new Error("fake-private-failure");
  });
  context.mock.method(console, "error", () => {});
  const first = await GET();
  const second = await GET();
  assert.equal(first.status, 500);
  assert.equal(second.status, 500);
  assert.notEqual(first.headers.get("X-Request-Id"), second.headers.get("X-Request-Id"));
});
