# Day 2 - TypeScript practice

- Status: Completed (technical work verified; learning questions waived by user).
- Session date (Asia/Karachi): 2026-10-18.
- Advancement approval: user explicitly requested starting Day 2 now and then said "skip questions start woking in day 2". This overrides the previous learning gate and permits Day 2 on the same date as Day 1.

## Goal and task checklist

Understand how TypeScript describes data and why incoming data needs checks at runtime.

- [x] Define Client, UserRole, ProjectStatus, TaskStatus, and Priority.
- [x] Add and run small examples of optional fields, unions, unknown, narrowing, typed functions, and async/await.
- [x] Run type checking.
- [x] Explain in writing why request input still needs runtime validation.
- [x] Resolve learning check: user explicitly waived questions. Independent typed-function writing and explanation were not demonstrated.

## Work actually completed

Inspected progress records, Day 1/Day 2 notes, generated AGENTS.md, app files, TypeScript configuration, architecture values, and installed Next.js TypeScript documentation.

Added Client with id, name, optional company/email/notes, and ISO-string createdAt/updatedAt timestamps. This represents the future week-one client response, not unchecked request input. Later database/archive/version fields are deferred.

Added architecture-defined role, project-status, task-status, and priority unions without building those features. Added a runnable .mts practice file with typed functions, optional-field fallback, unknown object checks, union narrowing using an ok field, and async/await. It prints fake examples only; it creates no persistent records or HTTP routes.

Added learning README with the run/check commands and simple explanations. The small name check is an exercise, not the Day 4 Zod schema; it deliberately does not implement email, maximum-length, or unknown-field validation.

## Files created or changed

- encova-hub/modules/clients/types.ts: Client type.
- encova-hub/types/domain.ts: UserRole, ProjectStatus, TaskStatus, Priority.
- encova-hub/learning/day-02.mts: runnable practice examples.
- encova-hub/learning/README.md: simple explanations and commands.
- README.md and encova-hub/README.md: current work and learning-file pointers.
- docs/progress.md, docs/days/day-01.md, docs/days/day-02.md, docs/decisions.md, docs/project-plan.md, docs/README.md: actual status, scope, and explicit learning-check waiver.

## Checks run and actual results

- npx.cmd --yes pnpm@10.34.7 exec tsc --noEmit: exit 0.
- npx.cmd --yes pnpm@10.34.7 lint: exit 0.
- node learning/day-02.mts: exit 0. Actual output:

```text
Optional company: Example Client (No company supplied)
Union choices: MEMBER PLANNED TODO MEDIUM
Accepted practice name: Example Client
Rejected practice input: The name cannot be blank.
Rejected practice input: Expected an object with a text name.
Rejected practice input: Expected an object with a text name.
Rejected practice input: Expected an object with a text name.
Async label: Example Client (No company supplied)
```

The three matching rejection messages came from number-valued name, null, and plain-string inputs. This is a practice-script execution, not an API integration test. Node strips types when executing this file; the separate compiler command verifies types.

At initial Day 2 completion, no application build, browser/HTTP recheck, or automated tests had run. The later user-requested review below adds that evidence. No dependency or lockfile changes were needed.

Final documentation review: root/app/docs README links resolved and git diff --cached --check passed. Prepared changes for review; no commit, push, or deployment performed.

## Understanding demonstrated

No independent Day 2 code or explanation demonstrated. All Day 2 code was written by the assistant at the user's request. User explicitly asked to skip questions. Learning verification is waived, not passed.

## Remaining tasks or problems

No remaining Day 2 implementation task or failing regression check. One unpatched development-tool dependency advisory remains; see the review below. Independent understanding is unverified by explicit waiver. Day 3 remains Pending and unapproved.

## Exact resume point

Wait for explicit approval to begin Day 3. When approved and the calendar rule is satisfied or explicitly excepted, inspect the repository, explain temporary server-only storage and services, then build GET /api/clients. Do not start automatically or repeat the skipped learning questions.

## User-requested repeated tests and security review - 2026-10-18

User requested testing multiple times, fixing gaps, and checking security. This authorizes focused testing of existing code now; it does not start Day 3 or implement Day 6's future API validation work.

Reproduced array/inherited-name acceptance and demo output during module import. Fixed name reading to use an own data property, reject arrays and getters, and avoid invoking accessors. Guarded demo execution so imports are quiet. Added 18 Node regression tests. Added test/typecheck/practice package scripts and allowImportingTsExtensions for direct test imports, keeping strict/noEmit enabled.

Observed missing security headers and added nosniff, frame denial, referrer policy, and restricted browser permissions. Disabled X-Powered-By and made default dev/start listeners loopback-only. Existing app routes and scope remain unchanged.

Files changed: learning/day-02.mts, new learning/day-02.test.mts, learning/README.md, package.json, tsconfig.json, next.config.ts, root/app README, docs/README.md, docs/security-review.md, docs/progress.md, this daily record, and docs/decisions.md.

Actual results:

- Initial post-fix test run: 18/18 passed. Three final runs: 18/18 passed each time (54 final executions).
- Three rounds of typecheck and lint: all exit 0.
- Practice script: exit 0 and expected output.
- Production build: exit 0; only starter and not-found routes.
- Production HTTP checks: 3 rounds, 21 requests; home/headers and private-path 404 assertions all passed.
- Listeners: dev 3000 and temporary production 3100 both bound to 127.0.0.1. Stopped the temporary production helper after testing.
- Credential-pattern scan: 36 text files, 0 pattern matches; ignored/binary/history files were not scanned.
- Production audit: exit 0, 0 known advisories. Full audit: exit 1, 1 high-severity braces advisory in dev lint dependencies, with no published patch. Verified dependency path and upstream advisory; did not suppress it.
- Frozen-lockfile installation after changes: passed, already up to date.
- Final documentation links, staged whitespace, and working diff checks passed. Original HEAD unchanged; temporary production server confirmed stopped.

See security-review.md for the exact remaining advisory, commands, and limits. These tests verify existing code, not independent learner understanding. Current day stays Day 2 Completed with learning questions waived; Day 3 is still Pending.
