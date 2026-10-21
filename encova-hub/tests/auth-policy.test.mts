import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../modules/auth/password.ts";
import { canAttemptLogin, clearLoginFailures, recordLoginFailure } from "../modules/auth/login-rate-limit.ts";
import { requireOwner } from "../modules/auth/service.ts";
import { DomainError } from "../server/errors.ts";
import type { AppUser } from "../modules/auth/types.ts";

const owner: AppUser = { id: "550e8400-e29b-41d4-a716-446655440001", authSubject: "test:owner", email: "owner@example.test", name: "Test Owner", role: "OWNER" };
const member: AppUser = { ...owner, id: "550e8400-e29b-41d4-a716-446655440002", authSubject: "test:member", email: "member@example.test", role: "MEMBER" };

test("password hashes verify only the original password", async () => {
  const hash = await hashPassword("test-only-long-password");
  assert.match(hash, /^scrypt\$16384\$8\$1\$/);
  assert.equal(await verifyPassword("test-only-long-password", hash), true);
  assert.equal(await verifyPassword("wrong-test-password", hash), false);
  assert.equal(await verifyPassword("test-only-long-password", "not-a-password-hash"), false);
});

test("login attempts are limited per normalized identity and expire", () => {
  const email = "rate-limit@example.test";
  const start = 1_700_000_000_000;
  clearLoginFailures(email);
  for (let index = 0; index < 5; index += 1) recordLoginFailure(email, start);
  assert.equal(canAttemptLogin(email, start + 1), false);
  assert.equal(canAttemptLogin(email, start + 15 * 60 * 1000 + 1), true);
});

test("owner policy denies a member before any repository call", () => {
  assert.doesNotThrow(() => requireOwner(owner));
  assert.throws(() => requireOwner(member), (error) => error instanceof DomainError && error.status === 403 && error.code === "FORBIDDEN");
});
