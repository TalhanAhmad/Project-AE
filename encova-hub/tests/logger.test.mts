import assert from "node:assert/strict";
import { test } from "node:test";
import { logFailure, writeLog } from "../server/logger.ts";

test("structured logs contain only deliberate safe fields", () => {
  const messages: string[] = []; const original = console.error;
  console.error = (message: string) => { messages.push(message); };
  try { logFailure("clients.create.failed", "00000000-0000-4000-8000-000000000000", "INTERNAL_ERROR", Date.now() - 3); }
  finally { console.error = original; }
  assert.equal(messages.length, 1);
  const entry = JSON.parse(messages[0] ?? "{}") as Record<string, unknown>;
  assert.deepEqual(Object.keys(entry).sort(), ["action", "code", "durationMs", "level", "requestId", "timestamp"]);
  assert.equal(entry.action, "clients.create.failed"); assert.equal(entry.code, "INTERNAL_ERROR");
});

test("configured log level suppresses lower-priority entries", () => {
  const messages: string[] = []; const original = console.info; const previous = process.env.LOG_LEVEL;
  console.info = (message: string) => { messages.push(message); }; process.env.LOG_LEVEL = "warn";
  try { writeLog("info", { action: "health.checked", code: "OK" }); }
  finally { console.info = original; if (previous === undefined) delete process.env.LOG_LEVEL; else process.env.LOG_LEVEL = previous; }
  assert.deepEqual(messages, []);
});
