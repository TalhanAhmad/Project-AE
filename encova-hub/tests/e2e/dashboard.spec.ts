import { expect, test } from "@playwright/test";

test("dashboard and task workspace load safe visible states", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Active projects", { exact: true })).toBeVisible();
  await expect(page.getByText("Overdue tasks", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed tasks", { exact: true })).toBeVisible();
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
  await expect(page.getByLabel("Search task titles")).toBeVisible();
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  expect(errors).toEqual([]);
});
