# Encova Hub application

This folder holds the Next.js App Router app, strict TypeScript, Tailwind, tests and pinned pnpm lockfile. Read the [project README](../README.md) for setup, API rules, test commands and limitations. Read [progress](../docs/progress.md) before each session.

```powershell
npx.cmd --yes pnpm@10.34.7 install --frozen-lockfile
npx.cmd --yes pnpm@10.34.7 dev
```

Open http://127.0.0.1:3000/clients. Use fake details only; process-local memory resets. No login or database is required. Ctrl+C stops the server.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` through pinned npx.cmd as shown in the root README. With the server running, run `pnpm test:http` then `pnpm test:browser` sequentially. Unit checks: 64. HTTP checks: 19. Browser checks: 14, using installed Chrome by default. TEST_BASE_URL selects another local port; PLAYWRIGHT_CHANNEL selects another installed supported browser. Screenshots/traces are ignored.

The /clients page renders components/clients/client-workspace.tsx. GET and POST /api/clients call the server-only modules/clients/service.ts and store.ts. Shared Zod validation lives in schemas.ts; the browser checks response JSON too. The service validates before insert, generates IDs/UTC timestamps and returns explicit fields. Root page redirects to /clients. Layout supplies metadata, global CSS supplies styles, and external fonts are unnecessary.

The form handles loading/empty/pending/success/errors. Failures keep input; a confirmed write remains visible if its refresh fails. No POST is automatically replayed. The server enforces strict fields, JSON media, a 32 KiB streamed limit and local origin/host rules. These are not authentication.

Keep patches/next@16.4.2.patch and pnpm-workspace.yaml together with the lockfile. This custom TRACE safeguard applies to standard Next CLI servers and needs review on upgrades. Persistent Turbopack caches are disabled after reproducing stale production CSS. See [security review](../docs/security-review.md) for results and the remaining development-only advisory.

Day 2 practice is in learning/day-02.mts, types/domain.ts and modules/clients/types.ts. Read [the learning guide](learning/README.md). Week 2 database/authentication/project/task features and public deployment are outside this milestone. Working code does not verify independent learning.
