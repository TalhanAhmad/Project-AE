import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  describeNameResult,
  formatClientLabel,
  getPracticeClientLabel,
  readPracticeName,
} from "./day-02.mts";
import type { Client } from "../modules/clients/types";

const client: Client = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Example Client",
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

test("trims names without changing the input object", () => {
  const input = Object.freeze({ name: "  Example Client  " });
  assert.deepEqual(readPracticeName(input), { ok: true, name: "Example Client" });
  assert.equal(input.name, "  Example Client  ");
});

const invalidInputs: [string, unknown][] = [
  ["null", null],
  ["undefined", undefined],
  ["string", "Example Client"],
  ["number", 42],
  ["boolean", false],
  ["empty object", {}],
  ["nontext name", { name: 42 }],
  ["array", []],
  ["array carrying a name", Object.assign([], { name: "Array name" })],
  ["inherited name", Object.create({ name: "Inherited name" })],
];

for (const [label, input] of invalidInputs) {
  test(`rejects ${label}`, () => {
    assert.deepEqual(readPracticeName(input), {
      ok: false,
      message: "Expected an object with a text name.",
    });
  });
}

test("rejects empty and whitespace-only names", () => {
  for (const name of ["", "   ", "\t\n", "\u00a0"]) {
    assert.deepEqual(readPracticeName({ name }), {
      ok: false,
      message: "The name cannot be blank.",
    });
  }
});

test("does not invoke a name getter", () => {
  let calls = 0;
  const input = Object.defineProperty({}, "name", {
    get() {
      calls += 1;
      throw new Error("A name getter must not run");
    },
  });
  assert.equal(readPracticeName(input).ok, false);
  assert.equal(calls, 0);
});

test("accepts Unicode names from parsed JSON", () => {
  assert.deepEqual(readPracticeName(JSON.parse('{"name":"  علی  "}')), {
    ok: true,
    name: "علی",
  });
});

test("formats optional company and a supplied company", () => {
  assert.equal(formatClientLabel(client), "Example Client (No company supplied)");
  assert.equal(
    formatClientLabel({ ...client, company: "Example Agency" }),
    "Example Client (Example Agency)",
  );
});

test("describes successful and failed results", () => {
  assert.equal(
    describeNameResult({ ok: true, name: "Example" }),
    "Accepted practice name: Example",
  );
  assert.equal(
    describeNameResult({ ok: false, message: "Invalid input" }),
    "Rejected practice input: Invalid input",
  );
});

test("async helper returns a Promise containing the expected label", async () => {
  const result = getPracticeClientLabel(client);
  assert.ok(result instanceof Promise);
  assert.equal(await result, formatClientLabel(client));
});

test("importing the practice module produces no demo output", () => {
  const moduleUrl = new URL("./day-02.mts", import.meta.url).href;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(moduleUrl)})`],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});
