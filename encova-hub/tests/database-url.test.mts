import assert from "node:assert/strict";
import { test } from "node:test";
import { requireVerifiedRemoteTls } from "../modules/shared/database-url.ts";

test("remote PostgreSQL URLs use explicit full TLS verification", () => {
  const result = new URL(requireVerifiedRemoteTls(
    "postgresql://user:password@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ));
  assert.equal(result.searchParams.get("sslmode"), "verify-full");
  assert.equal(result.searchParams.get("channel_binding"), "require");
  assert.equal(result.hostname, "ep-example-pooler.us-east-1.aws.neon.tech");
});

test("local PostgreSQL URLs remain unchanged", () => {
  const input = "postgresql://user:password@127.0.0.1:55432/encova_hub?sslmode=require";
  assert.equal(requireVerifiedRemoteTls(input), input);
});

test("already strict or unspecified remote TLS modes remain unchanged", () => {
  const strict = "postgresql://user:password@db.example.test/app?sslmode=verify-full";
  const unspecified = "postgresql://user:password@db.example.test/app";
  assert.equal(requireVerifiedRemoteTls(strict), strict);
  assert.equal(requireVerifiedRemoteTls(unspecified), unspecified);
});
