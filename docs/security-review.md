# Code and security review - 2026-10-18

Date uses Asia/Karachi. Scope: the existing Day 1 setup and Day 2 practice code. The user explicitly requested repeated testing, fixes, and a security check. Day 3 was not started.

This is the Day 2 review snapshot. Day 3 was subsequently approved and implemented; its current results are in [day-03.md](days/day-03.md) and [progress.md](progress.md). In particular, GET /api/clients now returns 200 instead of the historical 404 below. The earlier GET-only snapshot does not certify the new endpoint.

The latest follow-up at the end of this file records the subsequent safe-error fix, Next.js TRACE patch, 28 unit tests, and 16 live HTTP tests. Earlier counts below are historical evidence, not the current suite size.

Day 4 has since added POST and request validation. Its newest results are in the final Day 4 section below: 64 unit checks, 19 HTTP checks, and production audit across 95 dependencies. Earlier GET-only behavior/counts remain historical snapshots.

## Findings and fixes

1. The name exercise accepted inherited names and arrays with a name property. Reproduced both before changing code. It now rejects arrays and reads only an own data property. Getters are rejected without execution. This is still a practice function, not the future request-validation schema.
2. Importing the example module printed all demo output. Reproduced during the initial probe. The demo now runs only when the file is executed directly; importing helpers is quiet.
3. The home page lacked explicit basic browser-security headers. Added nosniff, frame denial, a referrer policy, and a permissions policy disabling camera, microphone, and geolocation. Removed X-Powered-By. Verified actual production HTTP responses after building.
4. Package dev/start scripts previously depended on callers to choose a loopback address. Both now default to 127.0.0.1, matching this project's local-only scope. The production test listener was confirmed on 127.0.0.1:3100, and the existing dev listener on 127.0.0.1:3000.

## Actual checks

| Check | Result |
| --- | --- |
| Post-fix initial regression test run | 18 passed, 0 failed |
| Final regression rounds 1, 2, and 3 | 18 passed per run, 0 failed; 54 final test executions |
| Type checking, rounds 1-3 | All passed, exit 0 |
| ESLint, rounds 1-3 | All passed, exit 0 |
| Practice script | Passed; expected optional-field, union, rejection, and async output |
| Production build | Passed, exit 0; only / and not-found routes generated |
| Production HTTP/security rounds 1-3 | 21 requests total; all expectations passed |
| Production dependency audit | Exit 0; 0 known advisories reported across 93 dependency entries |
| Full dependency audit | Exit 1; 1 high-severity advisory, in development lint tooling |
| Text credential-pattern scan | 36 text files scanned, 0 matches for tested patterns |
| Git ignore checks | Root/app .env, dependency folders, and build output ignored |
| Frozen-lockfile install after changes | Passed, already up to date; no dependency/lockfile changes |
| Final README links and Git whitespace checks | Passed; original HEAD unchanged; only dev port 3000 remains listening |

The 18 tests exercise trimming and immutability; null/undefined/string/number/boolean inputs; missing and nontext names; ordinary and decorated arrays; inherited names; empty/whitespace names; getters; Unicode JSON; optional company; success/failure unions; async results; and quiet module imports.

Each HTTP round checked a 200 starter home page, four exact security-header values, absent X-Powered-By, and 404 for /.env, /.git/config, /package.json, /modules/clients/types.ts, /learning/day-02.mts, and /api/clients. No client endpoint exists yet. The temporary production server on port 3100 was stopped after testing; the existing dev server on port 3000 was retained.

The credential scan checks common private-key, GitHub token, OpenAI token, AWS key-ID, and credential-bearing PostgreSQL URL patterns in current textual project files. It did not scan Git history, binary documents, ignored local files, or external accounts. Zero matches is not proof that no secret exists.

## Remaining dependency risk

The full audit reports **GHSA-vfj7-8cjw-p6xm / CVE-2026-93687**, a high-severity stack-exhaustion issue in braces 3.0.3. Dependency path:

```text
eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces
```

pnpm why confirms this is under devDependencies. The production-only audit reports zero known advisories. This does not make the full audit clean.

The [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. The [upstream issue](https://github.com/micromatch/braces/issues/70) describes uncontrolled recursion in nested brace patterns. Registry checks found braces 3.0.3 and eslint-config-next/Next.js 16.4.2 as the current published versions during this review; no compatible patched upgrade was available. No advisory suppression or unreviewed dependency override was added.

For this local project, lint operates on trusted repository paths. Avoid feeding untrusted generated glob patterns into the lint/file-matching tools and recheck the advisory before introducing automated linting of outside code. Re-run the full audit and update once an upstream fix is available. This warning remains open.

## Re-run from encova-hub/

```powershell
npx.cmd --yes pnpm@10.34.7 test
npx.cmd --yes pnpm@10.34.7 typecheck
npx.cmd --yes pnpm@10.34.7 lint
npx.cmd --yes pnpm@10.34.7 build
npx.cmd --yes pnpm@10.34.7 audit --prod
npx.cmd --yes pnpm@10.34.7 audit
```

The last command is expected to remain nonzero while the development advisory is unresolved. Test a built app locally with `npx.cmd --yes pnpm@10.34.7 start --port 3100`; stop it with Ctrl+C when done.

## Limits

These checks cover the current starter page and learning helpers. Authentication, permissions, database safety, real API validation, and user-content rendering cannot be tested yet because those features do not exist. No live deployment, penetration-test certification, or blanket security guarantee is implied. The user waived learning questions; none of these automated checks verifies the learner's understanding.

## Day 3 follow-up - 2026-10-18

Added a server-only read path with explicit response fields and no-store caching. Eight new tests cover isolated/copy-safe stores, extra-field exclusion, optional fields, and empty/populated GET handler behavior. Both dev and built production servers returned GET 200/empty data and POST 405 with data unchanged; existing nosniff and frame-denial headers remained present. No mutation or test-seeding HTTP endpoint was added. The populated handler test uses an isolated seeded store in its own test process, not live client data.

Added server-only@0.0.1. Production audit was rerun: exit 0, zero known advisories across 94 entries. The full audit was not rerun and its previous development-only braces finding remains open. The app is still local-only, unauthenticated, and fake-data only. No blanket security claim is made.

## Latest Day 3 review - 2026-10-18

The user requested another code, bug, and security review. Only existing Day 1-3 code changed; no client creation or later feature was implemented.

### Safe unexpected errors

An isolated failure-injection probe confirmed that storage errors escaped GET. The route now returns a generic JSON 500 with no-store caching and a random UUID request ID, also present in X-Request-Id. Its log event contains only a fixed event/code and that request ID, not the exception, stack, request body, or storage details. Tests prove the body and captured log omit the injected private-detail string and separate failures get distinct IDs. No HTTP failure-trigger or seeding endpoint was added.

### Version-pinned TRACE patch

Raw HTTP TRACE requests initially produced framework 500 responses before the Route Handler ran; development responses included framework debug data. Fetch cannot send TRACE, so the first probe was replaced with Node's raw HTTP client. Inspecting installed NextRequestAdapter/start-server source confirmed the exception originates during Web Request construction outside our route. The [upstream discussion](https://github.com/vercel/next.js/discussions/86271) describes the same request-adaptation limitation.

The project now maintains a narrow patch in encova-hub/patches/next@16.4.2.patch, registered by pnpm patchedDependencies in pnpm-workspace.yaml and the lockfile. Nine added lines reject TRACE in the standard CLI server's HTTP listener before adaptation. Response: plain text Method Not Allowed, HTTP 405, no-store, and nosniff. It does not echo request headers or generate framework debug HTML. The same behavior passed on the home page and client API in both dev and production.

This is a project patch, not a vendor security release. It applies to the tested standard Next CLI server entry point, not every possible hosting/custom-server path. Review/rebase or remove it when upgrading Next.js, and retest the actual hosting entry point before any future deployment. Frozen installation preserved the applied patch, and the dev process was cold-restarted to load it. No node_modules-only fix was left unrecorded.

Root .gitattributes keeps patch files at LF to preserve their locked bytes across Windows checkouts. Final README links and Git whitespace checks passed, original HEAD was unchanged, and the retained dev API returned HTTP 200.

### Actual final results

| Check | Result |
| --- | --- |
| Unit regression rounds 1-3 | 28 passed per run; 84 executions, 0 failures |
| Dev HTTP rounds 1-2 | 16 tests passed per run |
| Production HTTP rounds 1-2 | 16 tests passed per run |
| Concurrency | 20 simultaneous reads per HTTP round; all returned the unchanged empty store |
| Type checking and lint | Passed after fixing nullable request-ID handling in a new test |
| Production build | Passed; client API remains dynamic |
| Frozen install | Passed; pinned TRACE patch confirmed in installed Next.js |
| Full audit at review start | Same 1 high development-only braces advisory; not suppressed |
| Production audit after patch | Exit 0; 0 known advisories across 94 dependency entries |
| Credential-pattern scan | 43 text files; no matches for tested patterns; same exclusions as initial scan |

Initial failures were retained in the daily record: TRACE HTTP test failed with 500 instead of 405, and type checking found nullable header handling in the new regression test. Both were corrected before the final passing rounds.

The 16 HTTP tests check JSON/no-store/security headers; HEAD without a body; OPTIONS allow-list; unsupported POST/PUT/PATCH/DELETE; raw TRACE on API and home with no header echo; no CORS permission for an unrelated origin; six private-path 404s; and 20 concurrent GETs. They describe a fresh Day 3 store. Update POST-405 and fresh-store expectations when implementing Day 4.

Run against the existing local dev server:

```powershell
npx.cmd --yes pnpm@10.34.7 test
npx.cmd --yes pnpm@10.34.7 test:http
```

To test a built server, start it on port 3100 in one terminal, then in a second terminal run:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3100'
npx.cmd --yes pnpm@10.34.7 test:http
Remove-Item Env:\TEST_BASE_URL
```

The temporary production process used for this review was stopped; patched dev server remains on 127.0.0.1:3000. No Git commit, push, or deployment was performed. The full audit is still not clean because the braces development dependency has no published patch. Authentication, real request validation, and database safety remain unimplemented milestone work; this review is not proof of universal security.

## Day 4 creation/validation checks - 2026-10-18

User explicitly approved Day 4. Added strict Zod 4.6.7 input validation before inserts, server-generated UUID/UTC timestamps, and explicit client responses. The schema accepts only name/email/company/notes. Browser-supplied IDs, roles, timestamps, prototype keys, nulls, and wrong types are rejected. Tests verify invalid input never reaches insert or changes the list.

POST requires JSON, validates the actual local loopback Host/port and any supplied Origin, rejects cross-site Fetch metadata, and limits actual streamed bytes to 32 KiB even without or with a falsely small Content-Length. Streams exceeding the limit are cancelled, malformed UTF-8 is rejected, and valid multibyte characters split across chunks are decoded correctly. A maximum-length Unicode input fits within the body limit. Optional string bounds are documented in README and day-04.md.

Initial real HTTP tests revealed that comparing Origin directly to Next's normalized request URL incorrectly denied requests to 127.0.0.1. Inspected installed NextURL source, reproduced the mismatch, and fixed it using an exact Host allowlist plus port check. Regression tests cover that normalization, forged hosts, malformed authorities, and different local ports. Browser Origin checking is a local mutation safeguard; origin-free API clients can still create fake records. It is not identity verification or production authorization.

Responses: 201 created, 400 malformed JSON, 422 invalid fields, 403 forbidden origin/host, 413 excessive body, 415 unsupported media, and generic 500 with request ID for unexpected failures. All JSON responses are no-store. Validation errors expose only allowlisted fields/_form and useful messages; unknown input keys, raw values, and stack traces are not reflected or logged. Existing headers and the pinned framework TRACE patch remain active.

Final actual results:

- 64 unit checks passed in two final rounds (128 executions).
- 19 live HTTP checks passed twice in development and twice in production (76 test executions). These include valid POST->GET, malformed/invalid-input non-mutation, origin/media/size rejection, read methods, private paths, TRACE rejection, concurrent reads, and concurrent creations.
- Typecheck, lint, production build, and frozen install passed. Framework patch remained installed.
- Production audit: exit 0, no known advisories across 95 entries.
- Full audit: exit 1, same one high development-only braces advisory. No suppression or claimed fix for it.
- Temporary production process stopped; dev server retained with only synthetic fixture records from live HTTP tests.

Initial test failures are recorded in day-04.md: two implicit-any test parameters and four live HTTP failures due to the loopback-origin mismatch. Both were corrected before the final passing rounds. No later-day UI, authentication, database, deployment, or automatic GitHub push was added. Current changes remain local. This is evidence of the tested behavior, not a claim that all possible vulnerabilities are absent.

Validation follows the installed version and [official schema API](https://zod.dev/api) and [error-formatting guidance](https://zod.dev/error-formatting). Actual Unicode boundary behavior was also verified locally.

## Final Week 1 review - 2026-10-18

This section supersedes earlier snapshots that said the UI or request validation was future work. User explicitly approved completing Days 5-7. Full findings and limitations are in [Week 1 report](week-1-report.md).

The browser now uses shared strict input rules and checks API response JSON. Blank optional email is omitted; Unicode limits match the installed schema. Invalid fields keep input and receive accessible messages. A field-focus bug was reproduced and fixed by focusing after pending controls re-enable. Pending submission guards prevent duplicate clicks. No failed/uncertain POST is automatically replayed, and confirmed saved rows remain visible if the following GET fails. HTML-like names and notes render as text; a browser regression verified no injected elements or executed payload. Long details fit a 375px mobile viewport.

A production browser run initially passed 13/14 while HTTP/build checks were green. The failed mobile layout exposed old starter CSS in the production output. Fetched CSS and computed styles confirmed it. Installed Next cache documentation supports disabling persistent Turbopack caches; fresh compilation then served current CSS and all 14 browser checks passed. This is a local workaround; revisit it and the pinned TRACE patch with a tested framework upgrade.

Final evidence:

- 64 unit tests passed in each of two Day 6 rounds (128 executions); Day 5 also ran 64 successfully.
- Final development and production each passed 19 real HTTP checks and 14 headless Chrome browser checks. Browser retries were zero. A final dev repeat after configuration changes also passed.
- Typecheck, lint and production build passed after the final code/configuration changes.
- Clean local-source copy (55 paths, no prior dependencies/build cache or Git metadata): frozen install and build passed; actual browser create/list/reload/API checks, current mobile styles and installed TRACE rejection passed. Patch bytes matched SHA-256. This is current local work, not the earlier GitHub publication.
- Production audit exit 0: zero known advisories across 98 entries. Full audit exit 1: same high development-only braces 3.0.3 advisory, GHSA-vfj7-8cjw-p6xm, with no patched version reported. It remains open and unsuppressed. Playwright added no further reported advisories.
- Targeted credential-pattern scan at review time: 46 text files, no tested-pattern matches or forbidden tracked environment/dependency/build/test/key artifacts. Earlier document/history scan evidence remains above; no claim of universal secret detection.
- Git working/index whitespace checks passed. Temporary production servers stopped; development remains on loopback port 3000. No new commit, push or deployment.

Remaining limits: process-local disposable memory can reset and has no global capacity cap, paging or durable recovery; no authentication or multi-user permissions; version-specific custom framework patch and disabled persistent caches; Chrome tested here, optional Chromium configuration not executed. These checks support the tested local learning flow and do not establish public-production readiness or absence of all possible vulnerabilities. Week 2 features remain unimplemented. Independent endpoint rebuilding and learner understanding remain unverified.

## Week 2 final database and API review - 2026-10-18

Week 1 was committed/pushed first as 48e0920 (Week one done), with matching remote/local hashes. Week 2 was explicitly authorized afterward and remains local/uncommitted. See [Week 2 report](week-2-report.md) and [database setup](database-setup.md).

Persistent client/project services now use server-only PostgreSQL/Prisma queries with explicit DTOs. Project responses select only client ID/name, never private contact/notes. Schema enforces UUID keys, enum values, bounded text, nonblank names, positive versions and restrictive foreign keys. Project creation uses a parameterized client lock/transaction and rejects missing/archived clients before insert. IDs/timestamps are server-generated. No client-supplied object is passed unrestricted to Prisma.

Role separation was verified: runtime cannot create schema/tables, read migration history or connect to the test database. It has reads/inserts and client UPDATE privilege required for row locks. The migration account owns schema changes; credentials are randomly generated ignored local files, not runtime admin access. Cluster listens on 127.0.0.1:55432 with SCRAM. Setup preserves existing environment/data, refuses occupied ports, checks pinned archive bytes and validates stored generated password format before bootstrap SQL. No public database or app deployment is configured.

The first integration run exposed an actual UTC storage error (13/14 passed): adapter values looked correct while raw stored instants were five hours off. Set UTC per runtime/seed pool session; check both raw SQL and returned timestamps, wall time and boundary date-only values. An app restart replaced the cached development pool. Earlier synthetic fixtures were not rewritten.

A final null-character JSON probe returned 500 because PostgreSQL text rejected input that had passed the original schema. Shared rules now reject U+0000 and unpaired Unicode surrogates before storage with 422 fields, preventing both avoidable database errors and lossy UTF-8 encoding. Unit, real database and real HTTP cases verify rejected input does not write. Existing unknown-field/origin/media/streamed body-limit/safe-error/TRACE checks remain active. Rendered project/client text remains escaped; duplicate submission and failed-refresh behavior are tested.

Final actual evidence after the fixes:

- 97 unit checks twice (194 executions); 14 real PostgreSQL integration checks twice (28); 30 production HTTP checks twice (60); 27 headless Chrome checks twice (54). Zero browser retries. These four repeated final suites total 336 named executions.
- Typecheck, lint and production build passed. Both APIs are dynamic; client/project pages are browser-driven static shells.
- Dedicated production helper used the separate test database. Integration ran separately and deletes only its own fixture IDs. Earlier development HTTP/browser suites intentionally added only fake fixtures to development. No development truncation/reset.
- Fresh unique scratch database recreated successfully from migrations, seeded twice with exactly 2 clients/3 projects and correct SQL join; only its generated scratch DB dropped.
- Real client/project IDs/names/relationship/due date/UTC timestamps survived verified app process stop/start. Separate SQL connection confirmed actual stored timestamps.
- Clean source copy: frozen install/explicit Prisma generation passed without .env or old dependencies; final synchronized source passed 97 unit checks and production build without a database connection. Neither secrets/database files nor Git metadata were copied.
- Production audit exit 0: no known advisories across 251 entries. Full audit exit 1: the same one high unpatched development-only braces issue across 577 entries, GHSA-vfj7-8cjw-p6xm. No suppression and no new reported advisory from added packages.
- Targeted review-time scan: 83 text files, no tested credential-pattern matches, no exact matches to the four generated local passwords, and no forbidden intended secret/data/build artifacts. SQL has no BOM/CRLF. This is targeted evidence, not proof against all possible secret leakage.

The user requested assistant completion with questions skipped. Independent SQL/explanation is unverified. Authentication, role/membership enforcement, pagination and deployment remain future work. Only fake local data is appropriate. Retain/review the inherited version-specific Next TRACE patch and disabled persistent caches on upgrades. Scratch schema recreation is not backup/restore of real data; later operations work remains necessary. No claim of universal security or public-production readiness is made.
