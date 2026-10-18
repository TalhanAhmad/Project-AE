# Encova Hub application

This folder contains the Next.js App Router app, strict TypeScript configuration, Tailwind styling, and pnpm lockfile.

Read the [project README](../README.md) for the purpose, setup instructions, checks, and week-one scope. Read [current progress](../docs/progress.md) before each learning session.

From this folder:

```powershell
npx.cmd --yes pnpm@10.34.7 install --frozen-lockfile
npx.cmd --yes pnpm@10.34.7 dev
```

Open http://127.0.0.1:3000. Stop the development server with Ctrl+C in its terminal.

```powershell
npx.cmd --yes pnpm@10.34.7 exec tsc --noEmit
npx.cmd --yes pnpm@10.34.7 lint
npx.cmd --yes pnpm@10.34.7 test
```

The starter page is `app/page.tsx`; `app/layout.tsx` wraps the pages, and `app/globals.css` loads Tailwind and global styles.

Day 3 adds `GET /api/clients`. Open http://127.0.0.1:3000/api/clients to see `{"data":[]}` from the initially empty server-only store. `app/api/clients/route.ts` calls `modules/clients/service.ts`, which reads `modules/clients/store.ts` and maps explicit fields. Responses are JSON with no-store headers. Memory may reset or differ across processes. POST is not implemented yet and returns 405.

`pnpm test` runs 28 checks using Node's server condition, including populated fixtures and sanitized failure responses. Fixtures do not change the running app. `pnpm test:http` runs 16 checks against the running local server (default port 3000); set TEST_BASE_URL to http://127.0.0.1:3100 to test a local production server instead. Only fake data is used; there is no authentication and this app must stay local.

The project pins a small Next.js 16.4.2 patch in `patches/next@16.4.2.patch` to reject TRACE before the framework adapter throws. pnpm applies it through pnpm-workspace.yaml and the lockfile. Review it during any Next.js upgrade; current tests verify both dev and production CLI servers.

Day 2 adds `modules/clients/types.ts`, `types/domain.ts`, and runnable examples in `learning/day-02.mts`. Read [the learning guide](learning/README.md), or run `node learning/day-02.mts` from this folder.

See the [security review](../docs/security-review.md) for verified fixes, repeated test results, and the remaining development-only dependency advisory.

Week one is local practice with fake client data. It will use disposable server memory, which may reset or differ between processes. No database, authentication, project/task features, or public deployment this week.
