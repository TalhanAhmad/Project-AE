import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, test } from "node:test";

const base = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("Local HTTP server required.");
const nativeFetch = globalThis.fetch;
let sessionCookie: Promise<string> | undefined;
let projectId = "";
let milestoneId = "";
let milestoneVersion = 0;

async function ownerCookie(): Promise<string> {
  const email = process.env.TEST_AUTH_EMAIL;
  const password = process.env.TEST_AUTH_PASSWORD;
  if (!email || !password) throw new Error("Set TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD for authenticated HTTP checks.");
  const csrf = await nativeFetch(new URL("/api/auth/csrf", base));
  const csrfBody = await csrf.json() as { csrfToken: string };
  const initial = csrf.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const response = await nativeFetch(new URL("/api/auth/callback/credentials", base), {
    method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: initial },
    body: new URLSearchParams({ csrfToken: csrfBody.csrfToken, email, password, callbackUrl: new URL("/projects", base).href, json: "true" }),
  });
  const session = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  if (response.status !== 302 || !session) throw new Error("The HTTP test owner could not sign in.");
  return session;
}

async function fetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Cookie", await (sessionCookie ??= ownerCookie()));
  return nativeFetch(new URL(url, base), { ...init, headers, signal: AbortSignal.timeout(15_000) });
}

function json(method: string, body: unknown, origin = base.origin): RequestInit {
  return { method, headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) };
}

before(async () => {
  const client = await fetch("/api/clients", json("POST", { name: `Milestone HTTP client ${randomUUID()}` }));
  assert.equal(client.status, 201);
  const clientId = (await client.json()).data.id;
  const project = await fetch("/api/projects", json("POST", { clientId, name: `Milestone HTTP project ${randomUUID()}` }));
  assert.equal(project.status, 201);
  projectId = (await project.json()).data.id;
});

test("milestone endpoint creates, lists, validates, and protects mutations", async () => {
  const endpoint = `/api/projects/${projectId}/milestones`;
  const created = await fetch(endpoint, json("POST", { title: "  HTTP release  ", dueDate: "2026-11-01" }));
  assert.equal(created.status, 201);
  const body = (await created.json()).data;
  milestoneId = body.id; milestoneVersion = body.version;
  assert.equal(body.title, "HTTP release"); assert.equal(body.status, "PLANNED"); assert.equal(body.taskCount, 0);
  assert.equal((await fetch(endpoint)).headers.get("Cache-Control"), "no-store");
  const list = await fetch(endpoint);
  assert.equal(list.status, 200);
  assert.ok((await list.json()).data.some((entry: { id: string }) => entry.id === milestoneId));
  const invalid = await fetch(endpoint, json("POST", { title: " ", privateField: true }));
  assert.equal(invalid.status, 422);
  const wrongOrigin = await fetch(endpoint, json("POST", { title: "Wrong origin" }, "https://unrelated.example.test"));
  assert.equal(wrongOrigin.status, 403);
});

test("task milestone endpoint enforces unlinking before deletion", async () => {
  const tasks = await fetch(`/api/projects/${projectId}/tasks`, json("POST", { title: "HTTP milestone task" }));
  assert.equal(tasks.status, 201);
  const task = (await tasks.json()).data;
  const linked = await fetch(`/api/tasks/${task.id}/milestone`, json("PATCH", { milestoneId, expectedVersion: task.version }));
  assert.equal(linked.status, 200);
  const linkedBody = (await linked.json()).data;
  assert.equal(linkedBody.milestoneId, milestoneId);
  const blocked = await fetch(`/api/milestones/${milestoneId}`, json("DELETE", { expectedVersion: milestoneVersion }));
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error.code, "MILESTONE_HAS_TASKS");
  const unlinked = await fetch(`/api/tasks/${task.id}/milestone`, json("PATCH", { milestoneId: null, expectedVersion: linkedBody.version }));
  assert.equal(unlinked.status, 200);
  const deleted = await fetch(`/api/milestones/${milestoneId}`, json("DELETE", { expectedVersion: milestoneVersion }));
  assert.equal(deleted.status, 200);
});
