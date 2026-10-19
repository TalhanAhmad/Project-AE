# Database setup and recovery exercises

Current Week 2 storage is PostgreSQL 17.11 with Prisma/client/adapter 7.10.1. Runtime uses pg 8.23.1. Node 24.19.0 and pnpm 10.34.7 were executed here. Only client/project creation/listing is implemented; use fake data locally.

## Optional Windows helper

From encova-hub/:

```powershell
npx.cmd --yes pnpm@10.34.7 install --frozen-lockfile
npx.cmd --yes pnpm@10.34.7 db:setup
npx.cmd --yes pnpm@10.34.7 db:migrate
npx.cmd --yes pnpm@10.34.7 db:seed
npx.cmd --yes pnpm@10.34.7 dev
```

The helper uses the zip linked by the [official PostgreSQL Windows page](https://www.postgresql.org/download/windows/) through [EDB binaries](https://www.enterprisedb.com/download-postgresql-binaries). The pinned archive is postgresql-17.11-5-windows-x64-binaries.zip, about 364 MiB. It checks the download's expected SHA-256 before extracting bin/lib/share into root .tools/postgresql-17.11. Expected hash: 80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F. This pins the bytes used here; it is not a separate vendor-signature verification.

Database files/logs/random local credentials live in root .local/postgres/. The cluster binds only 127.0.0.1:55432, uses UTF-8 and SCRAM password authentication, and is not registered as a Windows service. The helper preserves an existing .env and refuses to replace an initialized cluster with missing credentials. It refuses to take over an occupied database port. Do not delete the data directory to fix a configuration problem.

| Account | Purpose |
| --- | --- |
| encova_admin | Local cluster bootstrap and unique scratch-database recreation; never the app URL |
| encova_migrate | Owns development database/schema, applies migrations and grants runtime access |
| encova_app | Runtime client/project reads/inserts; client UPDATE privilege for required row locks; no schema creation or migration-history read |
| encova_test | Separate test database owner for real constraint tests and test-backed servers |

Development database: encova_hub. Test database: encova_hub_test. Public connection permission is revoked for both; each account is granted only its intended database access. The migration command grants runtime access only to application tables. It does not grant broad default access to future tables or migration history.

No secrets, binaries, database files, generated client, build output or test artifacts belong in Git. .env.example is the sole environment template and contains placeholders only. Keep local credential files private. The helper does not change existing machine-wide PostgreSQL settings.

## Start and stop later

```powershell
npx.cmd --yes pnpm@10.34.7 db:status
npx.cmd --yes pnpm@10.34.7 db:start
npx.cmd --yes pnpm@10.34.7 dev
```

Ctrl+C stops Next.js; PostgreSQL remains a separate background process. After stopping the app, db:stop stops this project's database cleanly. After reboot, start the database before the app. The database is not configured for automatic startup. Existing data remains on disk.

Changing DATABASE_URL or pool options requires an app restart: development reloads intentionally reuse one Prisma pool. Each pool is bounded and has connection/statement timeouts. Sessions explicitly use UTC; the installed adapter's date formatting made the cluster's initial Asia/Karachi session default unsafe for timestamps. Real integration tests compare stored instants against API values. Date-only due dates stay YYYY-MM-DD. Early synthetic fixtures from before this fix were not rewritten automatically.

## Existing PostgreSQL or another platform

The portable helper is Windows-only. With an existing local PostgreSQL installation, create separate development/test databases and separate migration/runtime users. Copy .env.example to .env and replace all placeholders. Configure DATABASE_URL for runtime, MIGRATION_DATABASE_URL for the owner/migration account on the same development database, and TEST_DATABASE_URL for a distinct local database ending in _test. This setup intentionally rejects using the same migration/runtime account.

Then run install, db:migrate, optional db:seed, and dev. Use Prisma 7's [PostgreSQL adapter/configuration guidance](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql) and the exact installed package versions. Database credentials must stay server-side. No hosted database was provisioned in this session, and these steps are local learning setup rather than a public deployment procedure.

## Schema and migrations

Client and Project use UUID primary keys, UTC timestamptz event timestamps, optional PostgreSQL date due dates, positive versions and nullable archive fields. Projects use a database enum and client_id foreign key with RESTRICT deletion/update. Names have bounded character lengths and a database nonblank check. Services also trim/validate input, reject unknown fields and reject null characters/malformed Unicode before PostgreSQL. Project responses expose only client ID/name.

The initial migration is prisma/migrations/202610180001_clients_projects/migration.sql. Keep applied migration bytes unchanged. Root .gitattributes forces SQL LF endings. The first apply here failed because PowerShell's UTF-8 output included a BOM; it failed before application-table creation. The BOM was removed, that failed migration marked rolled back, and the corrected migration applied without resetting the database. Do not copy that recovery action to an unrelated migration failure without investigating its effects.

After future schema edits, review a newly generated migration and run db:generate and db:migrate. Never edit an already applied migration to repair live data. No destructive reset command is part of this setup. Development reset/reseed and hosted release procedures need their own deliberate scope.

## Repeatable seed and SQL join

Seed writes only two documented synthetic client IDs and three project IDs (see prisma/seed-data.ts). Repeating upserts those same fake IDs; it does not duplicate or delete other records. Run only when you intend to create/update those fixtures. The seed is restricted to the documented loopback development/test/recreation database names and uses the migration account.

```powershell
npx.cmd --yes pnpm@10.34.7 db:seed
npx.cmd --yes pnpm@10.34.7 db:join
npx.cmd --yes pnpm@10.34.7 db:join 10000000-0000-4000-8000-000000000001
```

The second join command selects only Example Studio's two projects. It binds the optional UUID as a query parameter. SQL joins project.client_id to client.id; no private client notes/contact fields are selected. See [node-postgres parameterized queries](https://node-postgres.com/features/queries) and [PostgreSQL constraints](https://www.postgresql.org/docs/17/ddl-constraints.html).

## Recreate a separate database

With the helper's cluster running:

```powershell
npx.cmd --yes pnpm@10.34.7 db:verify-recreation
```

This creates a unique encova_recreate_<random hex> database owned by the local test account, applies all saved migrations, seeds twice, and checks exactly two clients/three projects plus the expected SQL join. It then drops only that unique scratch database created by the same invocation. It neither drops nor resets development or the configured test database. Passwords/URLs are not printed. This is a schema recreation exercise, not a backup/restore of existing business records.

For another database setup, manually create a new empty scratch database, point a separate shell's MIGRATION_DATABASE_URL at it, run the pinned Prisma migrate deploy command, explicitly seed only fake data, inspect constraints/counts/join, and remove only your verified scratch database. Do not redirect the ordinary app to a destructive reset. Full backup/restore operations belong to a later milestone.

## Prove restart persistence

With the normal app on port 3000 and the development database running:

```powershell
npx.cmd --yes pnpm@10.34.7 persistence:create
```

This creates a fake client/project through the real API, verifies actual stored UTC timestamps with a separate SQL connection, and saves their IDs under ignored .local/week2-persistence.json. Stop/restart the app, then run:

```powershell
npx.cmd --yes pnpm@10.34.7 persistence:check
```

The check verifies the same IDs, names, client relationship, due date and UTC timestamps. The verification cannot itself establish that a restart happened; the actual process stop/start was performed and recorded in the session evidence.

## Tests and scope

The 14 integration checks require separate local TEST_DATABASE_URL and remove only fixture IDs created by their run. Runtime cannot connect to that test database. HTTP/browser suites add synthetic records to their target server; use a test-backed server for repeated runs, and do not run competing write suites against the same database. See the root README for production test-server commands.

This week has no login, permissions, edit/archive/delete API, tasks/comments, pagination or deployment. Keep the loopback defaults and fake data. Independent SQL authorship/explanation remains unverified; these commands demonstrate assistant-written implementation and actual behavior.
