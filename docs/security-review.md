# Code and security review - 2026-10-18

Date uses Asia/Karachi. Scope: the existing Day 1 setup and Day 2 practice code. The user explicitly requested repeated testing, fixes, and a security check. Day 3 was not started.

This is the Day 2 review snapshot. Day 3 was subsequently approved and implemented; its current results are in [day-03.md](days/day-03.md) and [progress.md](progress.md). In particular, GET /api/clients now returns 200 instead of the historical 404 below. The earlier GET-only snapshot does not certify the new endpoint.

The latest follow-up at the end of this file records the subsequent safe-error fix, Next.js TRACE patch, 28 unit tests, and 16 live HTTP tests. Earlier counts below are historical evidence, not the current suite size.

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
