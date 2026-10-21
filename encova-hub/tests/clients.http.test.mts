import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import { test } from "node:test";

// Start the local server first. Override only to test another local port.
const baseUrl = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
if (
  baseUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost"].includes(baseUrl.hostname)
) {
  throw new Error("HTTP checks require a local HTTP server.");
}

const endpoint = new URL("/api/clients", baseUrl);
const timeout = () => AbortSignal.timeout(10_000);
const nativeFetch = globalThis.fetch;
let sessionCookie: Promise<string> | undefined;

async function ownerCookie(): Promise<string> {
  const email = process.env.TEST_AUTH_EMAIL;
  const password = process.env.TEST_AUTH_PASSWORD;
  if (!email || !password) throw new Error("Set TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD for authenticated HTTP checks.");
  const csrf = await nativeFetch(new URL("/api/auth/csrf", baseUrl));
  const csrfBody = await csrf.json() as { csrfToken: string };
  const initial = csrf.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const response = await nativeFetch(new URL("/api/auth/callback/credentials", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: initial },
    body: new URLSearchParams({ csrfToken: csrfBody.csrfToken, email, password, callbackUrl: new URL("/projects", baseUrl).href, json: "true" }),
  });
  const session = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  if (response.status !== 302 || !session) throw new Error("The HTTP test owner could not sign in.");
  return session;
}

async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const target = input instanceof Request ? new URL(input.url) : new URL(input instanceof URL ? input.href : input, baseUrl);
  if (target.origin !== baseUrl.origin) return nativeFetch(input, init);
  const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
  headers.set("Cookie", await (sessionCookie ??= ownerCookie()));
  return nativeFetch(input, { ...init, headers });
}

async function readClients() {
  const response = await fetch(endpoint, { signal: timeout() });
  assert.equal(response.status, 200);
  return (await response.json()).data;
}

function post(body: string, headers: Record<string, string> = {}) {
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl.origin, ...headers },
    body,
    signal: timeout(),
  });
}

test("GET returns uncached JSON with browser-security headers", async () => {
  const response = await fetch(endpoint, { signal: timeout() });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type") ?? "", /application\/json/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(response.headers.get("X-Powered-By"), null);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["data"]);
  assert.ok(Array.isArray(body.data));
});

test("HEAD returns success and headers without a body", async () => {
  const response = await fetch(endpoint, { method: "HEAD", signal: timeout() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(await response.text(), "");
});

test("OPTIONS advertises the supported read and create methods", async () => {
  const response = await fetch(endpoint, { method: "OPTIONS", signal: timeout() });
  assert.equal(response.status, 204);
  const methods = (response.headers.get("Allow") ?? "").split(/,\s*/).sort();
  assert.deepEqual(methods, ["GET", "HEAD", "OPTIONS", "POST"]);
});

for (const method of ["PUT", "PATCH", "DELETE"]) {
  test(`${method} remains unsupported`, async () => {
    const response = await fetch(endpoint, { method, signal: timeout() });
    assert.equal(response.status, 405);
    await response.arrayBuffer();
  });
}

test("TRACE is rejected", async () => {
  // Fetch forbids TRACE itself, so test the server using the HTTP client.
  const probe = "encova-review-header-must-not-be-echoed";
  for (const target of [endpoint, new URL("/", baseUrl)]) {
    const result = await new Promise<{
      status: number | undefined;
      cacheControl: string | string[] | undefined;
      body: string;
    }>((resolve, reject) => {
      const req = request(target, {
        method: "TRACE",
        headers: { "X-Review-Probe": probe },
      }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => { body += chunk; });
        response.on("error", reject);
        response.on("end", () => resolve({
          status: response.statusCode,
          cacheControl: response.headers["cache-control"],
          body,
        }));
      });
      req.setTimeout(10_000, () => req.destroy(new Error("TRACE check timed out")));
      req.on("error", reject);
      req.end();
    });
    assert.equal(result.status, 405);
    assert.equal(result.cacheControl, "no-store");
    assert.equal(result.body, "Method Not Allowed");
    assert.equal(result.body.includes(probe), false);
  }
});

test("an unrelated Origin does not receive permission to read the response", async () => {
  const response = await fetch(endpoint, {
    headers: { Origin: "https://unrelated.example.test" },
    signal: timeout(),
  });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
  await response.arrayBuffer();
});

for (const path of [
  "/.env",
  "/.git/config",
  "/package.json",
  "/modules/clients/store.ts",
  "/modules/clients/service.ts",
  "/learning/day-02.mts",
]) {
  test(`private source path ${path} is not served`, async () => {
    const response = await fetch(new URL(path, baseUrl), { signal: timeout() });
    assert.equal(response.status, 404);
    await response.arrayBuffer();
  });
}

test("twenty concurrent reads do not change current data", async () => {
  const before = await readClients();
  await Promise.all(
    Array.from({ length: 20 }, async () => {
      const response = await fetch(endpoint, { signal: timeout() });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { data: before });
    }),
  );
});

test("malformed JSON and invalid fields never create clients", async () => {
  const before = await readClients();
  const cases: [string, number][] = [
    [JSON.stringify({ name: "Fake\u0000Name" }), 422],
    [JSON.stringify({ name: "Valid", notes: "Fake\ud800Notes" }), 422],
    ["{", 400],
    ["", 400],
    ['{"name":" "}', 422],
    [JSON.stringify({ name: "a".repeat(121) }), 422],
    ['{"name":"Example","email":"invalid"}', 422],
    ['{"name":"Example","id":"browser-id"}', 422],
    ['{"name":"Example","role":"OWNER"}', 422],
    ['{"name":"Example","__proto__":{"admin":true}}', 422],
    ["null", 422],
    ["[]", 422],
  ];
  for (const [input, status] of cases) {
    const response = await post(input);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.ok((await response.json()).error.code);
  }
  assert.deepEqual(await readClients(), before);
});

test("wrong origins, content types, and oversized bodies cannot mutate storage", async () => {
  const before = await readClients();
  const attempts: [string, Record<string, string>, number][] = [
    ['{"name":"Example"}', { Origin: "https://unrelated.example.test" }, 403],
    ['{"name":"Example"}', { Origin: "null" }, 403],
    ['{"name":"Example"}', { "Sec-Fetch-Site": "cross-site" }, 403],
    ['{"name":"Example"}', { "Content-Type": "text/plain" }, 415],
    [JSON.stringify({ name: "Example", notes: "x".repeat(33 * 1024) }), {}, 413],
  ];
  for (const [body, headers, status] of attempts) {
    const response = await post(body, headers);
    assert.equal(response.status, status);
    assert.ok((await response.json()).error.code);
  }
  assert.deepEqual(await readClients(), before);
});

test("POST returns 201 and the created fake client appears in GET", async () => {
  const name = `HTTP Fixture ${randomUUID()}`;
  const response = await post(JSON.stringify({
    name: `  ${name}  `,
    email: " client@example.test ",
    company: " Fake Agency ",
    notes: " Fake HTTP test data ",
  }));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const { data } = await response.json();
  assert.equal(data.name, name);
  assert.equal(data.email, "client@example.test");
  assert.equal(data.company, "Fake Agency");
  assert.equal(data.notes, "Fake HTTP test data");
  assert.match(data.id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.equal(new Date(data.createdAt).toISOString(), data.createdAt);
  assert.equal(data.updatedAt, data.createdAt);
  const clients = await readClients();
  assert.deepEqual(clients.find((client: { id: string }) => client.id === data.id), data);
});

test("concurrent POST requests create distinct fake clients without lost writes", async () => {
  const names = Array.from({ length: 4 }, () => `Parallel Fixture ${randomUUID()}`);
  const results = await Promise.all(names.map(async (name) => {
    const response = await post(JSON.stringify({ name }));
    assert.equal(response.status, 201);
    return (await response.json()).data;
  }));
  assert.equal(new Set(results.map((client) => client.id)).size, 4);
  const clients = await readClients();
  for (const result of results) {
    assert.deepEqual(clients.find((client: { id: string }) => client.id === result.id), result);
  }
});
