# Encova Hub

Encova Hub is a learning project for an internal agency tool. Week 1 built the validated client form/API; Week 2's completed technical scope adds PostgreSQL storage and projects linked to clients. Read [current progress](docs/progress.md), [Week 1 report](docs/week-1-report.md), and the [Week 2 report](docs/week-2-report.md). Learning questions were skipped; independent understanding is not recorded as verified.

## Run on Windows

Use Node.js 24 (verified with 24.19.0), npm, Git and a network connection for the first install. This workspace is D:\AE project; after cloning, enter Project-AE/encova-hub instead.

```powershell
Set-Location 'D:\AE project\encova-hub'
npx.cmd --yes pnpm@10.34.7 install --frozen-lockfile
npx.cmd --yes pnpm@10.34.7 db:setup
npx.cmd --yes pnpm@10.34.7 db:migrate
npx.cmd --yes pnpm@10.34.7 db:seed
npx.cmd --yes pnpm@10.34.7 dev
```

The optional Windows db:setup helper downloads pinned PostgreSQL 17.11 binaries into ignored .tools, creates data/credentials under ignored .local, and writes .env if none exists. It uses loopback port 55432 and separate migration/application/test accounts. It does not install a machine service, replace an existing .env, or reset an existing database. Seed is optional, explicit, and limited to documented fake local IDs. See [database setup](docs/database-setup.md) for details and the existing-PostgreSQL alternative.

Open http://127.0.0.1:3000/clients or http://127.0.0.1:3000/projects. Home opens Clients. Keep the app terminal open; Ctrl+C stops it. PostgreSQL runs separately. Use db:start after reboot and db:stop to stop that project's database. The app's dev/start scripts bind to 127.0.0.1. If the app port is busy, use Next's printed address or stop the existing app server.

Use fake details locally. Records now survive app restarts and rebuilds because they live in PostgreSQL. Each configured database is separate. Authentication and multi-user permissions are Week 3; tasks/comments and deployment are later work. No external fonts are needed.

## Try the flow

1. Add a fake client on /clients. Name is required; email/company/notes are optional.
2. Open Projects and choose that client.
3. Enter a project name. Optionally choose a status, description and due date.
4. Add the project; it appears with the linked client name, status and date.
5. Refresh or restart the app. Saved records remain in the same database.

Both screens handle loading, empty lists, pending saves, success and errors. Failed submissions keep typed input and field errors focus the relevant control. A confirmed save remains visible if its following refresh fails. If a save response is uncertain, refresh before retrying; POST is never automatically replayed. Notes/descriptions expand, and all input renders as text.

## Checks

From encova-hub/:

```powershell
npx.cmd --yes pnpm@10.34.7 typecheck
npx.cmd --yes pnpm@10.34.7 lint
npx.cmd --yes pnpm@10.34.7 test
npx.cmd --yes pnpm@10.34.7 test:integration
npx.cmd --yes pnpm@10.34.7 build
npx.cmd --yes pnpm@10.34.7 db:verify-recreation
```

Unit tests: 97, without a running server/database. Prisma generation runs after installation; run db:generate after schema changes. Integration tests: 14, requiring a separate local TEST_DATABASE_URL ending in _test and distinct from development. They migrate that test database and remove only fixtures created by the run. They never truncate/reset the development database. The runtime account is checked for denied schema/migration-history access and denied test-database connection.

The recreation command uses our Windows helper's local admin credentials to create a unique scratch database. It applies migrations, seeds twice, checks exactly two clients/three projects and their SQL join, then drops only that newly created scratch database. It never drops the configured development/test database. For another PostgreSQL installation, follow the manual recreation instructions in the setup guide.

With a local server running, run HTTP and browser suites sequentially because both create fake fixtures:

```powershell
npx.cmd --yes pnpm@10.34.7 test:http
npx.cmd --yes pnpm@10.34.7 test:browser
```

There are 30 HTTP checks and 27 browser checks. They target port 3000 by default; use TEST_BASE_URL for a separate local server. Live checks intentionally add synthetic records to the target database. Prefer a test-backed server for repeated automated runs; the production rounds in this session used encova_hub_test. Run integration tests separately from live suites using that same test database.

Browser tests use installed Google Chrome with pinned Playwright 1.64.1. If Chrome is unavailable:

```powershell
npx.cmd --yes pnpm@10.34.7 exec playwright install chromium
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npx.cmd --yes pnpm@10.34.7 test:browser
Remove-Item Env:\PLAYWRIGHT_CHANNEL
```

Chrome was executed here; this optional Chromium path was not. Screenshots/traces are ignored in test-results/. Tests use Node's react-server condition for server-only modules. Next's normal build still checks client/server boundaries. Existing Node test infrastructure was retained rather than rewriting passing coverage into another runner.

To test a production build against the test database, build normally, then start this in one terminal:

```powershell
npx.cmd --yes pnpm@10.34.7 build
$testLine = Get-Content .env | Where-Object { $_.StartsWith('TEST_DATABASE_URL=') } | Select-Object -First 1
$env:DATABASE_URL = $testLine.Substring('TEST_DATABASE_URL='.Length)
npx.cmd --yes pnpm@10.34.7 start --port 3100
```

Use a separate terminal for checks:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3100'
npx.cmd --yes pnpm@10.34.7 test:http
npx.cmd --yes pnpm@10.34.7 test:browser
Remove-Item Env:\TEST_BASE_URL
```

Stop the helper server with Ctrl+C and remove Env:\DATABASE_URL from its terminal before running the development app again. Do not run competing write suites against the same database.

## API contract

GET /api/clients and GET /api/projects return 200 with `{ "data": [...] }`. Fresh migrated databases return empty arrays. POST returns 201 with `{ "data": { ... } }`. Lists are ordered by createdAt DESC, id DESC. All JSON responses are no-store. There is no pagination yet; that is later-week work.

| Client field | Rule |
| --- | --- |
| name | Required trimmed nonblank string, maximum 120 Unicode code points |
| email | Optional; supplied value must be valid/nonblank, maximum 254 |
| company | Optional trimmed string, maximum 120 |
| notes | Optional trimmed string, maximum 5000 |

Blank optional form fields are omitted. API callers should omit blank email; optional company/notes may be empty. Client responses retain the Week 1 fields: id, name, optional contact/notes, createdAt, updatedAt. Database archive/version fields are stored but no editing/archive route is implemented.

| Project field | Rule |
| --- | --- |
| clientId | Required UUID of an existing active client |
| name | Required trimmed nonblank string, maximum 120 Unicode code points |
| description | Optional trimmed string, maximum 5000 |
| status | PLANNED (default), ACTIVE, ON_HOLD or COMPLETED |
| dueDate | Optional real calendar date, YYYY-MM-DD, years 0001-9999 |

Project responses include server id/timestamps, version=1, nullable description/dueDate, clientId and a client object containing only id/name. They never include client email/private notes. Project creation locks the client in a transaction before checking archive state and inserting; PostgreSQL also enforces the foreign key and restricts client deletion when projects exist. No edit/archive/delete API is added in Week 2.

Unknown fields, supplied IDs/versions, wrong types and null inputs are rejected. Malformed JSON: 400. Invalid fields: 422. Missing project client: 404. Archived client: 409. Wrong origin/host: 403. Body over 32 KiB: 413. Non-JSON media: 415. Unexpected failures return safe JSON 500 with request IDs and sanitized logs. Error fields are allowlisted; unknown key names, raw values, stacks and credentials are not reflected.

PowerShell example:

```powershell
$payload = @{ name = 'Example Client'; email = 'client@example.test' } | ConvertTo-Json
$client = (Invoke-RestMethod 'http://127.0.0.1:3000/api/clients' -Method Post -ContentType 'application/json' -Body $payload).data
$project = @{ clientId = $client.id; name = 'Example Project'; dueDate = '2028-02-29' } | ConvertTo-Json
Invoke-RestMethod 'http://127.0.0.1:3000/api/projects' -Method Post -ContentType 'application/json' -Body $project
```

Browser mutations must match the validated local Host/port and Fetch metadata; origin-free local API tools are allowed. This is not authentication. Use fake data on loopback only until Week 3 access controls.

## Follow the backend

Pages render the interactive client/project workspaces. Browser fetch calls app/api/{clients,projects}/route.ts. The handler checks HTTP input, the service validates application input, and server-only query modules use Prisma/PostgreSQL. DTOs expose explicit fields; the browser checks response JSON before rendering. A Server Component needing database data should call the service directly, not call its own HTTP handler.

Database schema and SQL migrations live in encova-hub/prisma/. The single reused runtime pool is in server/database.ts. It explicitly uses UTC sessions: integration testing caught a five-hour adapter/session mismatch before this setting. ISO event timestamps use UTC; due dates are date-only values. Restart the app after changing connection settings because development reloads reuse the pool.

modules/clients/store.ts remains only as the Week 1 historical fake store for isolated tests; the running application has no memory fallback. Shared practice unions remain in types/domain.ts. Run node learning/day-02.mts and read [the learning guide](encova-hub/learning/README.md) for those exercises.

All code paths above are relative to encova-hub/. docs/ holds plans, status, daily evidence, reports and preserved source documents. The [client/project relationship](docs/client-project-relationship.md) is now implemented for creation/listing; its original Week 1 sketch remains historical context.

## Operational notes

A pinned Next.js 16.4.2 patch rejects TRACE before its standard CLI request adapter. Keep patches/next@16.4.2.patch, pnpm-workspace.yaml, lockfile and root LF attributes together. Review it on framework upgrades or different hosting entry points. Persistent Turbopack caches remain disabled after the Week 1 stale-CSS reproduction; builds compile fresh. This is a local workaround, not an upstream fix.

See [security review](docs/security-review.md). The latest production audit reports no known advisories; the full audit still has one high unpatched development-only braces issue. Tests are evidence for the local learning flow, not proof of public-production readiness.

## Git

Repository: [Project-AE](https://github.com/TalhanAhmad/Project-AE). Completed Week 1 was published as [48e0920 — Week one done](https://github.com/TalhanAhmad/Project-AE/commit/48e092007201366ec6308460757715312c02feea), and the remote hash was verified. Week 2 is current local work until another publication is requested.

Git includes app and docs in one working tree. This workspace retains metadata in encova-hub/.git with a root pointer/core.worktree setup; fresh clones use normal Git layout. No existing folders were moved. Dependencies, build/generated/test output, .env, local PostgreSQL binaries/data/credentials and TypeScript caches stay ignored. .env.example contains placeholders only. SQL migrations and the framework patch keep LF bytes so locked/checksummed files survive Windows checkout.
