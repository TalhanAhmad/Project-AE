import assert from "node:assert/strict";
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
  assert.deepEqual(await response.json(), { data: [] });
});

test("HEAD returns success and headers without a body", async () => {
  const response = await fetch(endpoint, { method: "HEAD", signal: timeout() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(await response.text(), "");
});

test("OPTIONS advertises only the supported read methods", async () => {
  const response = await fetch(endpoint, { method: "OPTIONS", signal: timeout() });
  assert.equal(response.status, 204);
  const methods = (response.headers.get("Allow") ?? "").split(/,\s*/).sort();
  assert.deepEqual(methods, ["GET", "HEAD", "OPTIONS"]);
});

// These expectations describe Day 3 only; update them when Day 4 adds POST.
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  test(`${method} is unavailable before client creation is implemented`, async () => {
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

test("twenty concurrent reads leave the fresh store empty", async () => {
  await Promise.all(
    Array.from({ length: 20 }, async () => {
      const response = await fetch(endpoint, { signal: timeout() });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { data: [] });
    }),
  );
});
