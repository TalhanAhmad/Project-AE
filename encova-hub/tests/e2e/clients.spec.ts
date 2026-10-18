import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";

function client(name = "Example Client", extra: Record<string, string> = {}) {
  return { id: randomUUID(), name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra };
}

async function emptyList(page: Page) {
  await page.route("**/api/clients", async (route) => {
    if (route.request().method() === "GET") await route.fulfill({ json: { data: [] } });
    else await route.fallback();
  });
}

test("home opens the clients screen and shows an empty state", async ({ page }) => {
  await emptyList(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page).toHaveTitle("Clients | Encova Hub");
  await expect(page.getByRole("heading", { name: "No clients yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add client" })).toBeEnabled();
});

test("loading is visible and prevents saving until the list is ready", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/clients", async (route) => {
    await gate;
    await route.fulfill({ json: { data: [] } });
  });
  await page.goto("/clients");
  await expect(page.getByText("Loading clients…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add client" })).toBeDisabled();
  release();
  await expect(page.getByRole("heading", { name: "No clients yet" })).toBeVisible();
});

test("real API saves trimmed details, refreshes the list, and survives reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const name = `Browser ${randomUUID()}`;
  await page.goto("/clients");
  await page.getByLabel("Client name").fill(`  ${name}  `);
  await page.getByLabel("Email", { exact: false }).fill("  demo@example.test  ");
  await page.getByLabel("Company", { exact: false }).fill("  Example Studio  ");
  await page.getByLabel("Notes", { exact: false }).fill("  Fake details only  ");
  const post = page.waitForRequest((request) => request.url().endsWith("/api/clients") && request.method() === "POST");
  await page.getByRole("button", { name: "Add client" }).click();
  expect((await post).postDataJSON()).toEqual({ name, email: "demo@example.test", company: "Example Studio", notes: "Fake details only" });
  await expect(page.locator("form").getByRole("status")).toHaveText(`Saved ${name}.`);
  const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(row.getByText("Example Studio")).toBeVisible();
  await expect(row.getByText("demo@example.test")).toBeVisible();
  await row.getByText("View notes").click();
  await expect(row.getByText("Fake details only")).toBeVisible();
  await expect(page.getByLabel("Client name")).toHaveValue("");
  await page.reload();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("blank optional fields are omitted and 120 emoji names match server validation", async ({ page }) => {
  await page.goto("/clients");
  const name = "😀".repeat(120);
  await page.getByLabel("Client name").fill(name);
  await page.getByLabel("Email", { exact: false }).fill("   ");
  const post = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/api/clients"));
  await page.getByRole("button", { name: "Add client" }).click();
  expect((await post).postDataJSON()).toEqual({ name });
  await expect(page.locator("form").getByRole("status")).toHaveText(`Saved ${name}.`);
  await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible();
});

test("blank names, oversized names and bad emails stay in the form without POST", async ({ page }) => {
  await emptyList(page);
  let posts = 0;
  page.on("request", (request) => { if (request.method() === "POST") posts++; });
  await page.goto("/clients");
  await page.getByLabel("Client name").fill("   ");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Enter a client name.")).toBeVisible();
  await expect(page.getByLabel("Client name")).toBeFocused();
  await page.getByLabel("Client name").fill("😀".repeat(121));
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.locator("#name-error")).toBeVisible();
  await expect(page.getByLabel("Client name")).toHaveValue("😀".repeat(121));
  await page.getByLabel("Client name").fill("Valid Name");
  await page.getByLabel("Email", { exact: false }).fill("not-an-email");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.locator("#email-error")).toBeVisible();
  expect(posts).toBe(0);
});

test("server field errors preserve input and focus the failed field", async ({ page }) => {
  await page.route("**/api/clients", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: [] } });
    await route.fulfill({ status: 422, json: { error: { code: "VALIDATION_ERROR", fields: { name: ["Please review this name."] } } } });
  });
  await page.goto("/clients");
  await page.getByLabel("Client name").fill("Keep My Name");
  await page.getByLabel("Notes", { exact: false }).fill("Keep my notes");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Please review this name.")).toBeVisible();
  await expect(page.getByLabel("Client name")).toHaveValue("Keep My Name");
  await expect(page.getByLabel("Notes", { exact: false })).toHaveValue("Keep my notes");
  await expect(page.getByLabel("Client name")).toBeFocused();
});

for (const failure of ["html error", "network failure", "malformed success"] as const) {
  test(`${failure} preserves details and gives a safe retry message`, async ({ page }) => {
    await page.route("**/api/clients", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { data: [] } });
      if (failure === "network failure") return route.abort("failed");
      if (failure === "html error") return route.fulfill({ status: 500, contentType: "text/html", body: "<h1>PRIVATE STACK</h1>" });
      return route.fulfill({ json: { data: { name: "Missing ID and timestamps" } } });
    });
    await page.goto("/clients");
    await page.getByLabel("Client name").fill("Keep Details");
    await page.getByRole("button", { name: "Add client" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Refresh the list before trying again");
    await expect(page.getByLabel("Client name")).toHaveValue("Keep Details");
    await expect(page.getByRole("button", { name: "Add client" })).toBeEnabled();
    await expect(page.getByText("PRIVATE STACK")).toHaveCount(0);
  });
}

for (const response of ["server error", "invalid JSON shape"] as const) {
  test(`list ${response} can be retried`, async ({ page }) => {
    let failing = true;
    await page.route("**/api/clients", async (route) => {
      if (failing) return route.fulfill(response === "server error" ? { status: 500, json: { error: {} } } : { json: { data: [42] } });
      await route.fulfill({ json: { data: [client("Recovered Client")] } });
    });
    await page.goto("/clients");
    await expect(page.locator("main").getByRole("alert")).toContainText("Could not refresh the list");
    failing = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovered Client" })).toBeVisible();
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  });
}

test("pending save disables fields and ignores duplicate form submissions", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let posts = 0;
  let saved = false;
  const record = client("One Save");
  await page.route("**/api/clients", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: saved ? [record] : [] } });
    posts++;
    await gate;
    saved = true;
    await route.fulfill({ status: 201, json: { data: record } });
  });
  await page.goto("/clients");
  await page.getByLabel("Client name").fill("One Save");
  await expect(page.getByRole("button", { name: "Add client" })).toBeEnabled();
  await page.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(page.getByLabel("Client name")).toBeDisabled();
  await expect.poll(() => posts).toBe(1);
  release();
  await expect(page.locator("form").getByRole("status")).toHaveText("Saved One Save.");
  expect(posts).toBe(1);
});

test("a failed refresh after creation keeps the saved row and does not repeat POST", async ({ page }) => {
  let failRefresh = true;
  let posts = 0;
  const record = client("Already Saved");
  await page.route("**/api/clients", async (route) => {
    if (route.request().method() === "GET") {
      if (posts && failRefresh) return route.fulfill({ status: 500, json: { error: {} } });
      return route.fulfill({ json: { data: posts ? [record] : [] } });
    }
    posts++;
    await route.fulfill({ status: 201, json: { data: record } });
  });
  await page.goto("/clients");
  await page.getByLabel("Client name").fill(record.name);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.locator("form").getByRole("status")).toHaveText("Saved Already Saved.");
  await expect(page.getByRole("heading", { name: record.name })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText("Could not refresh");
  await expect(page.getByLabel("Client name")).toHaveValue("");
  failRefresh = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  expect(posts).toBe(1);
});

test("untrusted text stays text and long details fit a mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const payload = '<img src=x onerror="window.injected=true">';
  const record = client(payload, { company: "c".repeat(120), notes: "<script>window.injected=true</script>" + "a".repeat(4500) });
  await page.route("**/api/clients", (route) => route.fulfill({ json: { data: [record] } }));
  await page.goto("/clients");
  await expect(page.getByRole("heading", { name: payload })).toBeVisible();
  await page.getByText("View notes").click();
  await expect(page.locator(".client-notes")).toContainText("<script>");
  await expect(page.locator(".client-list img, .client-list script")).toHaveCount(0);
  expect(await page.evaluate(() => "injected" in window)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
