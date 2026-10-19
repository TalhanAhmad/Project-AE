# Encova Hub application

Read the [project README](../README.md) and [database setup](../docs/database-setup.md) for setup, API rules, commands and limitations. Read [current progress](../docs/progress.md) before each session.

```powershell
npx.cmd --yes pnpm@10.34.7 install --frozen-lockfile
npx.cmd --yes pnpm@10.34.7 db:setup
npx.cmd --yes pnpm@10.34.7 db:migrate
npx.cmd --yes pnpm@10.34.7 db:seed
npx.cmd --yes pnpm@10.34.7 dev
```

Open http://127.0.0.1:3000/clients or /projects. Use fake details locally. PostgreSQL now persists data across app restarts. db:setup is an optional Windows portable-database helper and preserves existing .env/data. db:start/db:stop control that separate database process. For another PostgreSQL installation, configure the three placeholder URLs from .env.example and follow the setup guide.

Run typecheck, lint, test (97 unit checks), test:integration (14 real-PostgreSQL checks), and build through pinned npx.cmd. Prisma generation runs during install; db:generate updates it after schema changes. With a local server running, test:http runs 30 checks and test:browser runs 27 Chrome checks. Live suites add synthetic records; target a test-backed server and run sequentially. The integration suite requires a separate local _test database and removes only its own fixture IDs. TEST_BASE_URL chooses another local port.

Use db:verify-recreation for a fresh scratch-database migration/seed/join check with the optional local helper. db:join demonstrates a parameterized client/project join. persistence:create, then an actual app restart, then persistence:check verifies saved IDs/names/dates/timestamps. These commands use only fake fixtures; no production deployment is configured.

Pages contain interactive workspaces. GET/POST client/project Route Handlers call services and server-only query modules. Shared Zod schemas validate input and browser responses. server/database.ts reuses one bounded Prisma pool with UTC sessions. schema.prisma/migrations hold UUID relationships, PostgreSQL status enum, timestamptz/date fields, constraints and restrictive deletion. Runtime cannot create tables or access migration history. Clients have UPDATE privilege for required row locks; API edit/archive/delete routes are not implemented.

No authentication or multi-user permissions yet; those are Week 3. The old modules/clients/store.ts is a test-only Week 1 fixture, with no runtime fallback. Practice types/examples remain in learning/ and types/domain.ts; see [learning guide](learning/README.md).

Keep the custom Next TRACE patch, pnpm workspace config, lockfile and LF attributes together. Persistent Turbopack caches remain disabled after the verified stale-CSS issue. Generated files, test artifacts, database data and secrets are ignored. See [security review](../docs/security-review.md) for the remaining development-only dependency advisory and actual verification evidence.
