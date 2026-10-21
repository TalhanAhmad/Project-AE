import { request, type FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  const email = process.env.TEST_AUTH_EMAIL;
  const password = process.env.TEST_AUTH_PASSWORD;
  if (typeof baseURL !== "string" || !email || !password) throw new Error("Set TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD for browser checks.");
  const context = await request.newContext({ baseURL });
  try {
    const csrf = await context.get("/api/auth/csrf");
    const { csrfToken } = await csrf.json() as { csrfToken: string };
    const response = await context.post("/api/auth/callback/credentials", {
      form: { csrfToken, email, password, callbackUrl: new URL("/projects", baseURL).href, json: "true" },
      maxRedirects: 0,
    });
    if (response.status() !== 302) throw new Error("The browser test owner could not sign in.");
    await context.storageState({ path: "test-results/auth-owner.json" });
  } finally {
    await context.dispose();
  }
}
