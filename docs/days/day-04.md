# Day 4 - Create clients

- Status: Completed (technical checks passed; learning questions remain waived at the user's request).
- Session date (Asia/Karachi): 2026-10-18.
- Advancement approval: user explicitly said "start day 4", requesting work now on the same date. Day 5 is not approved.

## Goal and task checklist

Accept a client through POST, validate it on the server, and save only valid data in temporary memory.

- [x] Read progress, current code/instructions, milestone Day 4 requirements, installed Next.js route documentation, and official Zod API/error documentation.
- [x] Install pinned Zod and define strict client input schema.
- [x] Require a trimmed nonblank name with at most 120 characters.
- [x] Accept optional email/company/notes; validate supplied email and reject unknown fields.
- [x] Generate UUID and UTC timestamps on the server, never from browser input.
- [x] Implement POST /api/clients and keep successful reads consistent with creation.
- [x] Verify 201 valid, 400 malformed JSON, and 422 invalid fields without changes to storage.
- [x] Add origin/content-type/body-size checks and sanitized unexpected-error responses.
- [x] Update GET-only HTTP assertions for the new POST behavior.
- [x] Explain validation/request flow in writing. Questions are waived, not independently verified.

## Work actually completed

Added Zod 4.6.7 as an exact runtime dependency. Strict schema accepts only name, email, company, and notes. Name is trimmed/nonblank/max 120. Optional strings are trimmed; supplied email must be valid and at most 254 characters, company at most 120, notes at most 5000. Optional company/notes can be empty; supplied blank email is invalid, so a future form should omit an empty email field. Nulls and wrong types are rejected. Lengths follow installed Zod 4.6 Unicode-code-point behavior, tested with emoji.

Added a copy-safe insert method to the existing memory store. createClient validates unknown input at the service boundary before generating an ID/time or writing. UUID comes from crypto.randomUUID; createdAt/updatedAt are equal UTC ISO strings on creation. The same explicit DTO mapping is used by create and list; internal fields are not returned. No database, authentication, form, or reset/delete endpoint added.

Added POST with explicit JSON responses: 201 for creation, 400 malformed/unreadable JSON, 422 invalid fields. All responses use no-store. Validation errors use allowlisted field names plus _form, without raw input or arbitrary unknown key names. Unexpected errors use generic 500, a UUID request ID, and sanitized logs.

Added a server-only request reader. It validates local loopback host and port, requires matching Origin when supplied, rejects cross-site Fetch metadata, permits origin-free API tools, requires application/json, and enforces a 32 KiB limit on actual streamed bytes as well as declared length. It rejects malformed UTF-8, handles characters split across chunks, and cancels oversized streams. These are local browser-mutation safeguards, not authentication or deployment readiness.

A live test caught Next.js normalizing 127.0.0.1 URLs to localhost, incorrectly rejecting legitimate browser Origins. Fixed by validating the actual Host header against an exact loopback allowlist and matching port, then comparing Origin to that validated authority. Tests cover the normalized case, forged hosts, malformed authorities, and different ports; no broad origin exception was added.

Extended unit tests and updated real HTTP tests. HTTP tests now create fake clients, verify they appear in GET, and check invalid attempts leave storage unchanged. They preserve/compare existing data rather than assuming every run begins empty. Four concurrent HTTP creations and twelve concurrent service creations produce distinct IDs without lost records in a single process.

## Files created or changed

- encova-hub/modules/clients/schemas.ts: strict runtime schema and inferred input type.
- encova-hub/modules/clients/store.ts: copy-safe insert.
- encova-hub/modules/clients/service.ts: validated creation and shared explicit DTO mapping.
- encova-hub/server/http.ts: local-origin and bounded JSON reader.
- encova-hub/app/api/clients/route.ts: POST and safe responses.
- encova-hub/tests/create-clients.test.mts: 36 new service/handler/security/streaming checks.
- encova-hub/tests/clients.http.test.mts: updated 19-test live suite.
- encova-hub/package.json and pnpm-lock.yaml: pinned Zod and expanded test command.
- Root/app/learning README, docs/progress.md, this record, docs/decisions.md, docs/security-review.md: current behavior, commands, evidence, and limits.

## Checks run and actual results

- First unit run: 59/59 passed. Initial typecheck failed on two implicit-any mock parameters in the new test file; added explicit Client types, then checks passed.
- Expanded streaming tests: 61/61 passed; later origin regression cases: 63/63 passed.
- First HTTP run: 15/19 passed, 4 failed because legitimate 127.0.0.1 Origin requests were incorrectly rejected with 403. Inspected NextURL's loopback normalization and reproduced the differing origin behavior with actual requests. Fixed the authority comparison and added regressions. No failed run is counted as passing.
- Final unit rounds 1 and 2: 64/64 passed each time (128 final executions, 0 failures).
- Final dev HTTP rounds 1 and 2: 19/19 passed each time.
- Final production HTTP rounds 1 and 2: 19/19 passed each time. This includes valid POST->GET, 400/422 non-mutation, origin/content-type/size rejection, headers, unsupported methods, patched TRACE rejection, private paths, concurrent reads, and concurrent writes.
- Final typecheck and lint: exit 0.
- Production build: exit 0; /api/clients remains dynamic.
- Frozen install: exit 0; pinned Next.js TRACE patch remains installed.
- Production dependency audit: exit 0; zero known advisories across 95 entries.
- Full audit: exit 1 with the same one high development-only braces advisory. No published patch or suppression; remains open.
- Production test server on 3100 stopped. Existing local dev server on 3000 retained; live HTTP tests have created synthetic fixture clients in its disposable memory.
- README PowerShell POST example executed successfully, and a subsequent GET contained that generated client. Only fake data used.
- Final README links and staged/working whitespace checks passed. Changes staged for review; HEAD remains 2fb1b40. Only the dev server on 127.0.0.1:3000 remains listening.

## Understanding demonstrated

No new independent code or explanation demonstrated by the learner. User previously requested skipping questions. The implementation and test execution were performed by the assistant; understanding is waived, not verified. Written explanation: parse JSON -> validate in service -> generate server fields -> insert into memory -> return explicit client response. Invalid input stops before insert.

## Remaining tasks or problems

No unfinished Day 4 implementation task or failing final check. Temporary data may reset or differ across server processes. No authentication or production write access controls exist. One previously identified unpatched development dependency advisory remains. Tests use fake data only.

Day 4 changes are local and uncommitted/unpushed; the last published GitHub branch contains the verified Day 3 snapshot and its publication notes. This turn requested Day 4 work, not another push. No deployment performed.

Days 5-7 remain Pending, with no approval to start Day 5.

## Exact resume point

After explicit approval for Day 5, inspect current code/progress and implement /clients form and list with pending, empty, success, and error states. Submit JSON to POST, omit an empty optional email, display returned field errors, preserve input on failure, and refresh displayed data on success. Keep the UI minimal. Do not start automatically or ask waived learning questions.
