import { pathToFileURL } from "node:url";
import type { Client } from "../modules/clients/types";
import type {
  Priority,
  ProjectStatus,
  TaskStatus,
  UserRole,
} from "../types/domain";

// The ? in Client means company may be missing.
export function formatClientLabel(client: Client): string {
  return `${client.name} (${client.company ?? "No company supplied"})`;
}

type NameResult =
  | { ok: true; name: string }
  | { ok: false; message: string };

// unknown means we must check the value before using its properties.
// This is a small narrowing exercise, not the full Day 4 request schema.
export function readPracticeName(input: unknown): NameResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, message: "Expected an object with a text name." };
  }

  // Read only an own data field. Inherited properties and getters are not
  // client JSON fields, and a getter should not execute during this check.
  const nameField = Object.getOwnPropertyDescriptor(input, "name");
  if (!nameField || !("value" in nameField) || typeof nameField.value !== "string") {
    return { ok: false, message: "Expected an object with a text name." };
  }

  const name = nameField.value.trim();
  if (name.length === 0) {
    return { ok: false, message: "The name cannot be blank." };
  }

  return { ok: true, name };
}

export function describeNameResult(result: NameResult): string {
  // Checking ok narrows the union: only a successful result has name.
  if (result.ok) {
    return `Accepted practice name: ${result.name}`;
  }

  return `Rejected practice input: ${result.message}`;
}

// async wraps the returned string in a Promise. No network call here.
export async function getPracticeClientLabel(client: Client): Promise<string> {
  return formatClientLabel(client);
}

export async function runPracticeExamples(): Promise<void> {
  const exampleClient: Client = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Example Client",
    createdAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-10-18T10:00:00.000Z",
  };

  const role: UserRole = "MEMBER";
  const projectStatus: ProjectStatus = "PLANNED";
  const taskStatus: TaskStatus = "TODO";
  const priority: Priority = "MEDIUM";

  console.log("Optional company:", formatClientLabel(exampleClient));
  console.log("Union choices:", role, projectStatus, taskStatus, priority);

  // A string, null, or wrongly typed name cannot be trusted as client input.
  const practiceInputs: unknown[] = [
    { name: "  Example Client  " },
    { name: "   " },
    { name: 42 },
    null,
    "Example Client",
  ];

  for (const input of practiceInputs) {
    console.log(describeNameResult(readPracticeName(input)));
  }

  // await unwraps the Promise so we can use its string result.
  console.log("Async label:", await getPracticeClientLabel(exampleClient));
}

// Importing these helpers must not print or start the demo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runPracticeExamples();
}
