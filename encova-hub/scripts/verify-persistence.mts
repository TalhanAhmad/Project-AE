import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { clientListResponseSchema, clientCreatedResponseSchema } from "../modules/clients/schemas.ts";
import { projectListResponseSchema, projectCreatedResponseSchema } from "../modules/projects/schemas.ts";

const base = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
if (base.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("Use the local fake-data app only.");
const proofPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.local/week2-persistence.json");

async function post(endpoint: string, input: unknown): Promise<unknown> {
  const response = await fetch(new URL(endpoint, base), {
    method: "POST", headers: { "Content-Type": "application/json", Origin: base.origin },
    body: JSON.stringify(input), signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 201); return response.json();
}
if (process.argv[2] === "create") {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required before creating persistence fixtures.");
  const client = clientCreatedResponseSchema.parse(await post("/api/clients", { name: `Restart proof ${randomUUID()}` })).data;
  const project = projectCreatedResponseSchema.parse(await post("/api/projects", { clientId: client.id, name: `Persistent project ${randomUUID()}`, dueDate: "2028-02-29" })).data;
  const connection = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    await connection.connect();
    const clientRow = (await connection.query("SELECT name, created_at FROM clients WHERE id=$1", [client.id])).rows[0];
    const projectRow = (await connection.query("SELECT name, created_at FROM projects WHERE id=$1", [project.id])).rows[0];
    assert.equal(clientRow.name, client.name); assert.equal(projectRow.name, project.name);
    assert.equal(clientRow.created_at.toISOString(), client.createdAt);
    assert.equal(projectRow.created_at.toISOString(), project.createdAt);
  } finally { await connection.end(); }
  mkdirSync(path.dirname(proofPath), { recursive: true });
  writeFileSync(proofPath, JSON.stringify({ origin: base.origin, client, project }, null, 2));
  console.log("Created fake persistence fixtures and verified actual stored UTC timestamps. Restart the app, then run persistence:check.");
} else if (process.argv[2] === "check") {
  const saved = JSON.parse(readFileSync(proofPath, "utf8")) as { origin: string; client: { id: string; name: string; createdAt: string }; project: { id: string; clientId: string; name: string; createdAt: string; dueDate: string } };
  assert.equal(saved.origin, base.origin);
  const clientResponse = await fetch(new URL("/api/clients", base), { signal: AbortSignal.timeout(15000) });
  const projectResponse = await fetch(new URL("/api/projects", base), { signal: AbortSignal.timeout(15000) });
  assert.equal(clientResponse.status, 200); assert.equal(projectResponse.status, 200);
  const client = clientListResponseSchema.parse(await clientResponse.json()).data.find((row) => row.id === saved.client.id);
  const project = projectListResponseSchema.parse(await projectResponse.json()).data.find((row) => row.id === saved.project.id);
  assert.ok(client); assert.ok(project);
  assert.equal(client.name, saved.client.name); assert.equal(client.createdAt, saved.client.createdAt);
  assert.equal(project.name, saved.project.name); assert.equal(project.createdAt, saved.project.createdAt);
  assert.equal(project.clientId, saved.client.id); assert.equal(project.dueDate, saved.project.dueDate);
  console.log("Persistence check passed: the same client/project IDs, names, UTC timestamps and due date survived the app restart.");
} else { throw new Error("Use create or check."); }
