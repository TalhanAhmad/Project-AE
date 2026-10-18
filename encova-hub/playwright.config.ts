import { defineConfig } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const url = new URL(baseURL);
if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error("Browser tests must use the local learning server.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
