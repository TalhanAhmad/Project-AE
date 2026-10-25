import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";

const client = { id: randomUUID(), name: "Example Client", createdAt: "2026-10-18T10:00:00.000Z", updatedAt: "2026-10-18T10:00:00.000Z" };
function project(name = "Example Project", extra: Record<string, unknown> = {}) {
  return { id: randomUUID(), clientId: client.id, name, description: null, status: "PLANNED", dueDate: null, version: 1, createdAt: client.createdAt, updatedAt: client.updatedAt, client: { id: client.id, name: client.name }, ...extra };
}
async function clients(page: Page, records = [client]) {
  await page.route("**/api/clients", (route) => route.fulfill({ json: { data: records } }));
}
async function ready(page: Page) {
  await page.goto("/projects");
  await expect(page.getByText("Loading workspace…")).toHaveCount(0);
}

test("real project flow links a client and persists through reload", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const clientName = `Browser client ${randomUUID()}`;
  const response = await page.request.post("/api/clients", { data: { name: clientName } });
  expect(response.status()).toBe(201);
  const { data: savedClient } = await response.json();
  await ready(page);
  await expect(page).toHaveTitle("Projects | Encova Hub");
  await page.getByLabel("Client *", { exact: true }).selectOption(savedClient.id);
  const name = `Browser project ${randomUUID()}`;
  await page.getByLabel("Project name").fill(` ${name} `);
  await page.getByLabel("Status", { exact: true }).selectOption("ACTIVE");
  await page.getByLabel("Due date", { exact: false }).fill("2028-02-29");
  await page.getByLabel("Description", { exact: false }).fill(" Fake project details ");
  const request = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/api/projects"));
  await page.getByRole("button", { name: "Add project" }).click();
  expect((await request).postDataJSON()).toEqual({ clientId: savedClient.id, name, status: "ACTIVE", dueDate: "2028-02-29", description: "Fake project details" });
  await expect(page.locator("form").getByRole("status")).toHaveText(`Saved ${name}.`);
  const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(row.getByText(`Client: ${clientName}`, { exact: true })).toBeVisible();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
  await expect(row.locator("time")).toHaveText("2028-02-29");
  await row.getByText("View description").click();
  await expect(row.getByText("Fake project details")).toBeVisible();
  await expect(page.getByLabel("Project name")).toHaveValue("");
  await page.reload();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("project activity shows a safe task event", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const clientResponse = await page.request.post("/api/clients", { data: { name: `Activity client ${randomUUID()}` } });
  expect(clientResponse.status()).toBe(201);
  const projectResponse = await page.request.post("/api/projects", { data: { clientId: (await clientResponse.json()).data.id, name: `Activity project ${randomUUID()}` } });
  expect(projectResponse.status()).toBe(201);
  const { data: project } = await projectResponse.json();
  await page.goto(`/projects/${project.id}`);
  await expect(page.getByRole("heading", { name: project.name, exact: true })).toBeVisible();
  await page.getByLabel("Task title *").fill("Visible activity task");
  await page.getByRole("button", { name: "Add task" }).click();
  const activity = page.locator(".activity-panel");
  await activity.getByRole("button", { name: "Refresh" }).click();
  await expect(activity.getByText("created a task.", { exact: false })).toBeVisible();
  await expect(activity.getByText("Comment text is never shown here.", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test("owner creates and sees a milestone on the project page", async ({ page }) => {
  const clientResponse = await page.request.post("/api/clients", { data: { name: `Milestone browser client ${randomUUID()}` } });
  expect(clientResponse.status()).toBe(201);
  const projectResponse = await page.request.post("/api/projects", { data: { clientId: (await clientResponse.json()).data.id, name: `Milestone browser project ${randomUUID()}` } });
  expect(projectResponse.status()).toBe(201);
  const { data: project } = await projectResponse.json();
  await page.goto(`/projects/${project.id}`);
  await page.getByLabel("Milestone title *").fill("First release");
  await page.getByLabel("Due date", { exact: false }).last().fill("2026-11-01");
  await page.getByRole("button", { name: "Add milestone" }).click();
  const milestone = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "First release", exact: true }) });
  await expect(milestone.getByText("Planned · 0 linked tasks", { exact: true })).toBeVisible();
  await expect(milestone.getByText("2026-11-01", { exact: true })).toBeVisible();
});

test("no clients shows a useful next step and disables project creation", async ({ page }) => {
  await clients(page, []);
  await page.route("**/api/projects", (route) => route.fulfill({ json: { data: [] } }));
  await ready(page);
  await expect(page.getByRole("link", { name: "Add a client first" })).toHaveAttribute("href", "/clients");
  await expect(page.getByRole("button", { name: "Add project" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "No projects yet" })).toBeVisible();
});

test("project loading disables submit until both API reads finish", async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  await clients(page);
  await page.route("**/api/projects", async (route) => { await gate; await route.fulfill({ json: { data: [] } }); });
  await page.goto("/projects");
  await expect(page.getByText("Loading workspace…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add project" })).toBeDisabled();
  release();
  await expect(page.getByRole("button", { name: "Add project" })).toBeEnabled();
});

test("missing client, blank name and oversized Unicode are caught before POST", async ({ page }) => {
  await clients(page); let posts = 0;
  await page.route("**/api/projects", (route) => { if (route.request().method() === "POST") posts++; return route.fulfill({ json: { data: [] } }); });
  await ready(page);
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.locator("#clientId-error")).toBeVisible();
  await expect(page.getByLabel("Client *", { exact: true })).toBeFocused();
  await page.getByLabel("Client *", { exact: true }).selectOption(client.id);
  await page.getByLabel("Project name").fill("   ");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByText("Enter a project name.")).toBeVisible();
  await page.getByLabel("Project name").fill("😀".repeat(121));
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.locator("#name-error")).toBeVisible();
  expect(posts).toBe(0);
});

test("project server validation keeps details and focuses the failed field", async ({ page }) => {
  await clients(page);
  await page.route("**/api/projects", (route) => route.fulfill(route.request().method() === "GET" ? { json: { data: [] } } : { status: 422, json: { error: { code: "VALIDATION_ERROR", fields: { name: ["Please review this project name."] } } } }));
  await ready(page);
  await page.getByLabel("Client *", { exact: true }).selectOption(client.id);
  await page.getByLabel("Project name").fill("Keep Project");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByText("Please review this project name.")).toBeVisible();
  await expect(page.getByLabel("Project name")).toHaveValue("Keep Project");
  await expect(page.getByLabel("Project name")).toBeFocused();
});

test("an unavailable client error keeps input and points to the selector", async ({ page }) => {
  await clients(page);
  await page.route("**/api/projects", (route) => route.fulfill(route.request().method() === "GET" ? { json: { data: [] } } : { status: 409, json: { error: { code: "CLIENT_ARCHIVED" } } }));
  await ready(page);
  await page.getByLabel("Client *", { exact: true }).selectOption(client.id);
  await page.getByLabel("Project name").fill("Keep Project");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.locator("#clientId-error")).toContainText("This client is unavailable");
  await expect(page.getByLabel("Project name")).toHaveValue("Keep Project");
  await expect(page.getByLabel("Client *", { exact: true })).toBeFocused();
});

test("uncertain project save preserves input without automatic retry", async ({ page }) => {
  await clients(page); let posts = 0;
  await page.route("**/api/projects", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: [] } });
    posts++; return route.abort("failed");
  });
  await ready(page);
  await page.getByLabel("Client *", { exact: true }).selectOption(client.id);
  await page.getByLabel("Project name").fill("Keep Project");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Refresh before trying again");
  await expect(page.getByLabel("Project name")).toHaveValue("Keep Project");
  expect(posts).toBe(1);
});

test("confirmed project stays visible if its following refresh fails", async ({ page }) => {
  await clients(page); let posts = 0; let failing = true; const saved = project("Saved Project");
  await page.route("**/api/projects", (route) => {
    if (route.request().method() === "POST") { posts++; return route.fulfill({ status: 201, json: { data: saved } }); }
    if (posts && failing) return route.fulfill({ status: 500, json: { error: {} } });
    return route.fulfill({ json: { data: posts ? [saved] : [] } });
  });
  await ready(page);
  await page.getByLabel("Client *", { exact: true }).selectOption(client.id);
  await page.getByLabel("Project name").fill(saved.name);
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.locator("form").getByRole("status")).toHaveText("Saved Saved Project.");
  await expect(page.getByRole("heading", { name: saved.name })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText("Could not refresh projects");
  failing = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  expect(posts).toBe(1);
});

test("failed project list can be retried without losing loaded clients", async ({ page }) => {
  await clients(page); let failing = true;
  await page.route("**/api/projects", (route) => route.fulfill(failing ? { status: 500, json: { error: {} } } : { json: { data: [project("Recovered Project")] } }));
  await ready(page);
  await expect(page.locator("main").getByRole("alert")).toContainText("Could not refresh projects");
  failing = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recovered Project" })).toBeVisible();
});

test("failed client choices disable saving but retain readable projects", async ({ page }) => {
  let failing = true;
  await page.route("**/api/clients", (route) => route.fulfill(failing ? { status: 500, json: { error: {} } } : { json: { data: [client] } }));
  await page.route("**/api/projects", (route) => route.fulfill({ json: { data: [project()] } }));
  await ready(page);
  await expect(page.getByRole("heading", { name: "Example Project", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add project" })).toBeDisabled();
  failing = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add project" })).toBeEnabled();
});

test("pending project save prevents duplicate submission", async ({ page }) => {
  await clients(page); let release!: () => void; let posts = 0;
  const gate = new Promise<void>((resolve) => { release = resolve; }); const saved = project("Only One");
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: posts ? [saved] : [] } });
    posts++; await gate; await route.fulfill({ status: 201, json: { data: saved } });
  });
  await ready(page);
  await page.getByLabel("Client *", { exact: true }).selectOption(client.id);
  await page.getByLabel("Project name").fill(saved.name);
  await page.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect.poll(() => posts).toBe(1); release();
  await expect(page.locator("form").getByRole("status")).toHaveText("Saved Only One.");
  expect(posts).toBe(1);
});

test("project text is escaped and long details fit mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await clients(page);
  const payload = '<img src=x onerror="window.injected=true">';
  await page.route("**/api/projects", (route) => route.fulfill({ json: { data: [project(payload, { description: "a".repeat(5000), dueDate: "2028-02-29" })] } }));
  await ready(page);
  await expect(page.getByRole("heading", { name: payload })).toBeVisible();
  await page.getByText("View description").click();
  await expect(page.locator(".client-list img, .client-list script")).toHaveCount(0);
  expect(await page.evaluate(() => "injected" in window)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("malformed project responses show a list error instead of breaking the screen", async ({ page }) => {
  await clients(page);
  await page.route("**/api/projects", (route) => route.fulfill({ json: { data: [{ name: "Missing fields" }] } }));
  await ready(page);
  await expect(page.locator("main").getByRole("alert")).toContainText("Could not refresh projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
});
