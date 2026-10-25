import assert from "node:assert/strict";
import { test } from "node:test";

const base = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("Local HTTP server required.");

test("health check returns a small uncached status without configuration", async () => {
  const response = await fetch(new URL("/api/health", base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok" });
});
