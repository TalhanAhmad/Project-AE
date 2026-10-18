# Week 1 completion and code-review report

Date: 2026-10-18, Asia/Karachi.

All seven days' technical work is complete. The user explicitly approved finishing Days 5-7 now and skipped learning questions. Independent learning is not verified; the original Day 7 endpoint rebuild was not performed by the learner. This report does not claim otherwise.

Open the local app at http://127.0.0.1:3000/clients. At the review handoff, changes were local and the last verified GitHub publication was Day 3. The user subsequently authorized publishing this complete Week 1 snapshot as "Week one done" before starting Week 2. Publication verification is recorded in current progress. No deployment was performed.

## What works

| Day | Delivered |
| --- | --- |
| 1 | Next.js, strict TypeScript, Tailwind, setup instructions, Git and preserved source documents |
| 2 | Client/domain types, optional fields, unions, narrowing, unknown and async practice |
| 3 | Server-only temporary store, service and GET /api/clients with explicit fields |
| 4 | Validated POST, server UUID/timestamps, useful errors, streamed body/origin/media checks |
| 5 | Responsive /clients form/list, loading/empty/pending/success/error states, refresh and retained input |
| 6 | Repeated validation, API/browser checks, code review and fixes with actual evidence |
| 7 | Fresh-folder setup/demo verification, updated documentation and client/project planning sketch |

The form sends JSON to the API. The API checks the request and calls the service. The service validates the input and saves it in memory. The API returns JSON; the page checks that response, shows the saved client, and refreshes the list.

## Gaps fixed and safeguards verified

- Fixed server field-error focus: the browser now waits until disabled fields are enabled before focusing the failed field.
- Fixed stale production styling with a documented cache workaround. A successful build still served starter CSS; production mobile testing failed. Disabling persistent Turbopack caches and rebuilding produced current CSS and a passing browser suite. This does not claim an upstream framework fix.
- Shared validation prevents browser/server rule drift. Blank optional email is omitted. Unicode boundaries match the installed Zod rules rather than HTML's different length counting.
- Failed submissions preserve typed input. Duplicate pending submissions are guarded. A confirmed save remains visible if its following refresh fails. Uncertain writes are never automatically replayed.
- Response JSON is checked before rendering, and input is rendered as text. Browser tests exercised HTML-like names/notes without execution and long mobile details without overflow.
- Existing strict field rejection, validation-before-write, server-generated fields, copied storage, explicit responses, safe errors, origin/host restrictions, 32 KiB actual-byte limits, private-path denial and concurrent creation checks still pass.
- The pinned Next TRACE patch survives a fresh frozen installation and returns an uncached plain 405. Its scope remains standard Next CLI servers and its version must be reviewed on upgrades.

## Actual final checks

| Check | Result |
| --- | --- |
| Unit checks | 64/64, twice during Day 6 (128 executions); earlier Day 5 run also passed |
| Final development API checks | 19/19 |
| Final development Chrome browser checks | 14/14 |
| Final production API checks | 19/19 |
| Final production Chrome browser checks | 14/14 |
| Typecheck and lint | Passed, including after the cache configuration change |
| Production build | Passed; /clients static, client API dynamic |
| Fresh-folder frozen installation and build | Passed with Node 24.19.0 and pnpm 10.34.7 |
| Fresh-copy demo | Empty GET, home redirect, browser creation, list/reload, API-visible record and mobile CSS passed |
| Fresh-copy framework patch | TRACE 405 passed; patch SHA-256 matched source bytes |
| Production dependency audit | Exit 0; no known advisories across 98 entries |
| Full dependency audit | Exit 1; one high development-only braces advisory remains |
| Targeted credential-pattern scan | 46 text files at review time; no tested-pattern matches or forbidden tracked artifacts |
| Documentation and Git checks | 17 managed Markdown files, 36 local links, no broken links/trailing whitespace; Git working/index whitespace checks passed |

Final suites ran without automatic browser retries. Initial failures are recorded in [Day 5](days/day-05.md) and [Day 6](days/day-06.md), including test-harness corrections and the real focus/cache failures. A clean copy used 55 current intended source paths, with no existing node_modules, build cache or Git metadata. This verified current local files, not the older remote branch. Temporary production servers were stopped; local development remains on port 3000.

## Remaining limitations

1. The development lint dependency braces 3.0.3 has a high-severity [advisory with no patched version reported](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). It remains open and unsuppressed. Check again when a maintained patch becomes available.
2. Storage is disposable, process-local memory with no pagination, global capacity cap or durable recovery. No authentication or multi-user permissions exist. Use fake details locally. These are Week 1 scope limits, not finished production capabilities.
3. Independent endpoint rebuilding and request-flow explanations were not demonstrated. Passing assistant-written code does not verify learner understanding.
4. The custom framework patch and cache workaround require review during a future upgrade. Chrome was exercised here; the documented optional Chromium setup was not executed.

No required Week 1 technical tasks remain. The [relationship sketch](client-project-relationship.md) is documentation only. Exact next task: review this report; begin Week 2 planning only after the user explicitly requests it. A new commit/push or deployment also needs a request.
