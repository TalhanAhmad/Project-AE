# Encova Hub

Encova Hub is a learning project for an internal agency tool. Week 1 builds a local client form and list so we can follow a request from the browser to the server and back.

Week 1's technical work is complete; see the [completion report](docs/week-1-report.md). Read [current progress](docs/progress.md) for the authoritative status, [daily records](docs/README.md) for actual evidence, and [the project plan](docs/project-plan.md) for scope. Independent learning checks are separate from working code; the user asked to skip questions, so understanding is not recorded as verified.

## Run on Windows

Use Node.js 24 (verified with 24.19.0), npm, and Git. From a clone, enter `Project-AE/encova-hub/`; this workspace uses the path below:

```powershell
Set-Location 'D:\AE project\encova-hub'
npx.cmd --yes pnpm@10.34.7 install --frozen-lockfile
npx.cmd --yes pnpm@10.34.7 dev
```

Open http://127.0.0.1:3000/clients. Home also opens that page. Keep the terminal open; Ctrl+C stops the server. If port 3000 is busy, use Next's printed address or stop the existing app server. No database, account, environment secrets, or external fonts are needed. The first dependency install needs internet access. pnpm is pinned because the unpinned launcher failed on this Windows environment.

Use fake details only. Each server process has disposable memory. Restarting or rebuilding can reset the list; separate processes do not share it. There is no authentication or durable storage. Database setup, login, project/task features, and public deployment belong to later weeks.

## Try the client flow

1. Enter a fake client name; email, company and notes are optional.
2. Select Add client. Controls show a pending state while saving.
3. A successful save clears the form, shows confirmation, and refreshes the list.
4. A failed save keeps your input. Field errors point to the field to fix.
5. If confirmation is uncertain, refresh the list before trying again. The app never automatically repeats a POST. If only the refresh fails after a confirmed save, the saved row stays visible and Retry reloads the list.

The page also shows loading and empty states. Notes can be expanded. Names and notes are rendered as text, including HTML-like input. Long details wrap on mobile screens.

## Check the app

From `encova-hub/`, without needing a running server:

```powershell
npx.cmd --yes pnpm@10.34.7 typecheck
npx.cmd --yes pnpm@10.34.7 lint
npx.cmd --yes pnpm@10.34.7 test
npx.cmd --yes pnpm@10.34.7 build
```

The unit suite contains 64 checks of TypeScript helpers, storage, API responses, validation, failure handling, origin checks and streamed body limits. It uses Node's `react-server` condition to run server-only modules in a server test context. Next's normal build still enforces client/server separation.

With the dev server running, run these sequentially because both suites create fake records:

```powershell
npx.cmd --yes pnpm@10.34.7 test:http
npx.cmd --yes pnpm@10.34.7 test:browser
```

There are 19 live HTTP checks and 14 browser checks. Browser tests default to locally installed Google Chrome, verified here with Playwright 1.64.1. If Chrome is unavailable, install Playwright Chromium and select it:

```powershell
npx.cmd --yes pnpm@10.34.7 exec playwright install chromium
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npx.cmd --yes pnpm@10.34.7 test:browser
Remove-Item Env:\PLAYWRIGHT_CHANNEL
```

The Chromium alternative is documented from Playwright's supported browser configuration; this session executed Chrome only. Browser checks use the real API for successful creation/reload and controlled responses for empty/loading/error cases. No HTTP seed/reset route exists. Generated screenshots/traces stay ignored in test-results/.

To check the production build, run this in one terminal:

```powershell
npx.cmd --yes pnpm@10.34.7 build
npx.cmd --yes pnpm@10.34.7 start --port 3100
```

Then in another terminal:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3100'
npx.cmd --yes pnpm@10.34.7 test:http
npx.cmd --yes pnpm@10.34.7 test:browser
Remove-Item Env:\TEST_BASE_URL
```

Both test suites refuse non-loopback HTTP targets. Dev/start bind to 127.0.0.1 by default. Persistent Turbopack caches are disabled after this project reproduced a build that served stale starter CSS; builds take a little longer. The browser suite checks mobile layout as well as API behavior, because a successful build alone did not catch that gap.

## API contract

GET http://127.0.0.1:3000/api/clients returns HTTP 200 with `{ "data": [] }` in a fresh process. Created records appear in that array. Responses expose only explicit Client fields and use `Cache-Control: no-store`.

Create a fake client from PowerShell:

```powershell
$payload = @{ name = 'Example Client'; email = 'client@example.test' } | ConvertTo-Json
Invoke-RestMethod 'http://127.0.0.1:3000/api/clients' -Method Post -ContentType 'application/json' -Body $payload
```

POST returns 201 with `{ "data": { ... } }`, including a server-generated UUID and UTC createdAt/updatedAt.

| Field | Rule |
| --- | --- |
| name | Required, trimmed, nonblank, maximum 120 Unicode code points |
| email | Optional; if supplied, valid/nonblank and maximum 254 |
| company | Optional trimmed string, maximum 120 |
| notes | Optional trimmed string, maximum 5000 |

The form omits blank optional fields. API clients should omit blank email rather than send an empty string. Optional company/notes may be empty. Unknown fields, supplied IDs/timestamps, wrong types and nulls return 422 before insert. Error messages are under error.fields, with _form for general validation errors. Malformed JSON returns 400; wrong origin/host 403; body over 32 KiB 413; non-JSON media 415. Unexpected failures return safe JSON 500 with a request ID and sanitized logs.

Mutations require application/json, check actual streamed bytes, validate the local Host/port, match any supplied browser Origin, and reject cross-site Fetch metadata. API tools can omit Origin; these controls do not authenticate a user. See [security review](docs/security-review.md) for checks, limits, and the open unpatched advisory in development lint tooling. The production audit has no known advisories; the full audit is not clean.

## Follow the code

`app/clients/page.tsx` displays `components/clients/client-workspace.tsx`. The form sends JSON to `app/api/clients/route.ts`. That API handler reads the request and calls `modules/clients/service.ts`, which validates unknown input with the shared `schemas.ts`, creates IDs/timestamps, and uses the server-only `store.ts`. The handler sends JSON back. The browser validates the response before updating the screen.

A page displays the interface. An API handler receives HTTP and chooses the response. A service applies application rules and coordinates storage. The store only holds temporary records. `app/layout.tsx` supplies metadata; `app/globals.css` supplies Tailwind and global styles. Shared Client types live in modules/clients/types.ts; practice domain unions live in types/domain.ts. Run `node learning/day-02.mts` for practice examples, and read [the learning guide](encova-hub/learning/README.md).

These paths are relative to encova-hub/. Documentation and original supplied documents are in docs/ at the repository root. [The client/project sketch](docs/client-project-relationship.md) is a Week 2 plan only; it adds no project feature.

A project-maintained pnpm patch in `encova-hub/patches/next@16.4.2.patch` rejects TRACE before Next's standard CLI request adapter. pnpm-workspace.yaml and the lockfile apply it; .gitattributes preserves LF bytes for its hash. Review it on any framework upgrade or different hosting entry point. It is not an upstream security release.

## Git

Repository: [Project-AE on GitHub](https://github.com/TalhanAhmad/Project-AE). The user authorized publishing completed Week 1 as "Week one done" before starting Week 2. See docs/progress.md for verification and the current local/publication state.

Run git status from the project root or encova-hub/. Both belong to one worktree including docs/. This workspace keeps metadata in encova-hub/.git with a root pointer and core.worktree configuration, preserving the original scaffold history without moving folders. Fresh clones use a normal Git layout and need no pointer.

Dependencies, build output, environment files, test artifacts and TypeScript cache files are ignored. Review changes before a commit; push or deploy only when requested.
