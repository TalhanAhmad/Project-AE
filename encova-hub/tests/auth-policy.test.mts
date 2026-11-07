import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../modules/auth/password.ts";
import { loginLimitKey } from "../modules/auth/login-rate-limit.ts";
import { requireOwner } from "../modules/auth/service.ts";
import { DomainError } from "../server/errors.ts";
import type { AppUser } from "../modules/auth/types.ts";

const owner: AppUser = { id: "550e8400-e29b-41d4-a716-446655440001", authSubject: "test:owner", email: "owner@example.test", name: "Test Owner", role: "OWNER" };
const member: AppUser = { ...owner, id: "550e8400-e29b-41d4-a716-446655440002", authSubject: "test:member", email: "member@example.test", role: "MEMBER" };

test("password hashes verify only the original password", async () => {
  const hash = await hashPassword("test-only-long-password");
  assert.match(hash, /^scrypt\$16384\$8\$1\$/);
  assert.equal(Buffer.from(hash.split("$")[4] ?? "", "base64url").length, 32);
  assert.equal(await verifyPassword("test-only-long-password", hash), true);
  assert.equal(await verifyPassword("wrong-test-password", hash), false);
  assert.equal(await verifyPassword("\uD800", hash), false);
  assert.equal(await verifyPassword("test-only-long-password", "not-a-password-hash"), false);
});

test("login rate-limit keys normalize identity without storing the email", () => {
  assert.equal(loginLimitKey(" Rate-Limit@Example.Test "), loginLimitKey("rate-limit@example.test"));
  assert.notEqual(loginLimitKey("rate-limit@example.test"), "rate-limit@example.test");
});

test("owner policy denies a member before any repository call", () => {
  assert.doesNotThrow(() => requireOwner(owner));
  assert.throws(() => requireOwner(member), (error) => error instanceof DomainError && error.status === 403 && error.code === "FORBIDDEN");
});
