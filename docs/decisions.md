# Implementation decisions

## 2026-10-18 - Scope and records

Use the seven-day milestone for daily scope and the architecture for future direction. The user's explicit docs/progress.md requirement supersedes the document's WEEK_1_PROGRESS.md instruction. No old record exists to migrate.

Keep source copies in docs/references so future sessions can inspect the originals without relying on Downloads. Keep future daily records pending with planned tasks only.

## 2026-10-18 - Initial setup guidance

The workspace is empty. Propose encova-hub/ as the application directory, alongside root docs/, avoiding changes to the existing workspace folder name (which contains spaces). No application directory has been created yet. Future setup commands and README must clearly identify the app working directory.

Follow the architecture's pnpm lockfile choice. pnpm is absent from PATH; npx can invoke pnpm for the learner's scaffold attempt without requiring a global installation. Do not claim dependencies or versions are pinned until the generated manifest and lockfile are checked.

Do not generate the application before the learner's initial setup attempt: the user requested mentoring and a chance to attempt tasks. Documentation preparation is explicitly authorized and complete; application setup remains unfinished.

## 2026-10-18 - Actual scaffold and tool compatibility

Use pnpm 10.34.7 through npx for this setup. The unpinned pnpm command downloaded 12.14.0 and its Windows launcher failed. pnpm 10 succeeded and the generated packageManager field pins the resolved version; pnpm-lock.yaml records dependency resolutions.

The generated app uses app/ rather than the proposed src/app/. Keep the generated folders in place; no move/rename authorization has been requested or granted. Both layouts support App Router. Explicitly disabled optional cacheComponents, partialPrefetching, and agentFeedback after checking installed documentation because interactive keyboard responses did not produce intended settings. Keep the generated Tailwind loader configuration.

The scaffold initialized Git inside encova-hub/ and automatically committed its generated files. Root docs/ remains outside it. Repository coverage for documentation is unfinished; do not describe all project files as versioned. No additional commit, push, or deployment performed.

## 2026-10-18 - One Git worktree for app and learning records

The user requested completion of remaining Day 1 setup. Expanded the existing worktree to D:/AE project using core.worktree and a root .git pointer. Existing metadata and original scaffold commit remain in encova-hub/.git. No folders were moved or renamed. App and documentation are now in one repository; the index reflects paths relative to the wider root. New clones use the normal Git layout. Added root ignore rules and prepared changes for review without creating a new commit.

Wrote a root project README and a focused app README. Recorded Day 1 as Awaiting learning check because the technical requirements are satisfied but learner explanations of page and service responsibilities remain. The user's "complete that" instruction authorizes setup work; it does not supply evidence of understanding or approve Day 2.

## 2026-10-18 - Explicit learning-check waiver and Day 2 implementation

The user later said "skip questions start woking in day 2". This overrides the earlier question-based gate and authorizes same-date Day 2 work. Mark Day 1 and Day 2 Completed after technical verification with learning questions explicitly waived. Do not claim the learner independently wrote the code or explained its concepts, and do not repeat waived questions. Day 3 still needs approval.

Client uses camelCase names and ISO-string createdAt/updatedAt fields for the future week-one JSON response. Company, email, and notes are optional. Archive/version/database fields are deferred to later work. Architecture role/status/priority values are unions only, not implemented features.

Keep Client in modules/clients/types.ts and shared practice unions in types/domain.ts. Use learning/day-02.mts for runnable Node.js 24 examples: type-only imports are erased, .mts makes module behavior explicit, and no extra runtime dependency or TypeScript configuration change is needed. Run tsc separately because executing TypeScript with Node does not type-check it. The small name-narrowing example is not the full Day 4 validation schema.

## 2026-10-18 - Repeated testing and security fixes

The user's explicit test/security request authorizes regression tests for existing Day 2 helpers now. Use Node's built-in test runner, preserving no new dependencies; enable allowImportingTsExtensions with existing noEmit to test the actual .mts module. This supersedes the initial statement that no TypeScript option change was needed.

Read an own name data property instead of inherited or accessor properties, reject arrays, and keep imported modules quiet. Keep full request validation on its planned day. Add basic response headers and default loopback binding to suit local-only practice; no deployment feature or auth system added.

Retain the reported high-severity development-only braces advisory as an open issue: no upstream patched release exists in the checked registry/advisory. Do not suppress the audit, remove lint rules, or substitute an unreviewed dependency to claim a clean audit. Production audit and actual build/HTTP results are recorded separately in security-review.md.

## 2026-10-18 - Day 3 server-only read path

User explicitly approved Day 3 now; the earlier request to skip questions remains in effect. Keep learning verification waived, not passed. Do not start Day 4 without approval.

Use modules/clients/store.ts and service.ts alongside the existing Client type. Store factories accept fake initial records for isolated tests, while the application store starts empty. Copy inputs and results to avoid accidental mutation. Do not add a hidden HTTP seed/reset route or implement POST ahead of Day 4.

Use explicit field mapping in the service so future private storage fields cannot silently appear in responses. Mark store/service with server-only; install server-only@0.0.1 to resolve the imports in direct Node tests. Run server-module tests with the react-server condition, which selects the marker's server entry point. Do not use that test setting to bypass Next.js client-boundary checks in the app.

Use explicit .ts imports where the same source is executed by Node tests and Next.js, avoiding a new transpiler or alias loader. Set package type=module to make ESM explicit and remove the observed Node parsing warning; the subsequent tests, lint, and build passed. Keep existing strict/noEmit/allowImportingTsExtensions options.

GET /api/clients runs dynamically on Node.js with no-store responses. Live storage is empty. Populated response coverage uses the real GET handler in an isolated test process, temporarily supplying an actual seeded store through a mocked list method; it does not populate the live server. Authentication and PostgreSQL remain later work, so this route is local-only with fake data.

## 2026-10-18 - Safe read errors and reproducible HTTP checks

Add a small catch boundary directly to the existing GET handler instead of introducing an unused error framework. It emits generic JSON 500 plus a cryptographic UUID request ID and sanitized event log; raw exceptions, storage details, and stacks are not returned or logged by this handler.

Add two meaningful failure-path unit tests and a separate live HTTP suite. The normal test command remains independent of a running web server; test:http explicitly requires one. Its GET-only method expectations must change when Day 4 implements POST. Cross-origin checks verify absent CORS permission, not authentication or resistance to every network attack.

TRACE reproduced an upstream failure before application route dispatch. A project-maintained nine-line pnpm patch rejects it in Next.js 16.4.2's standard CLI listener before Web Request creation, with plain 405 and no reflected headers/debug details. This preserves the normal Next CLI, folder structure, and app architecture. pnpm-workspace.yaml and lockfile pin/apply the patch. Actual cold dev and production HTTP tests verify it. It is not an upstream security release; review on upgrades or different server/hosting entry points. Keep the unrelated unpatched braces development advisory open and unsuppressed.

Keep *.patch files at LF using root .gitattributes. This prevents Windows Git checkout line-ending conversion from changing the bytes used by pnpm's locked patch hash. Verify the raw patch blob matches its Git index blob.

## 2026-10-18 - Day 4 validation and creation

User explicitly approved Day 4 now; prior question waiver remains in effect. No Day 5 work authorized. New changes remain local; the prior one-time GitHub publication did not request automatically pushing every future feature.

Pin Zod 4.6.7 and use strictObject so browser IDs, timestamps, roles, and other unknown fields are rejected. Validate at the service boundary before any insert. Generate UUIDs and UTC ISO timestamps on the server and reuse explicit DTO mapping for list/create.

Beyond required name<=120, choose bounded optional strings: company<=120, notes<=5000, email<=254, all trimmed. Supplied email must be valid and nonempty; omitted email is allowed. Optional company/notes may be empty. These practical limits are explicit choices for local request safety, not extra feature modules. Zod 4.6 measures Unicode code points; tests verify 120-emoji names and maximum-size Unicode fields.

Use server/http.ts for an actual-byte-limited 32 KiB JSON reader and local mutation checks. Accept only JSON; compare supplied Origin to the actual validated local Host and port, reject cross-site Fetch metadata, and allow origin-free API tools. Next normalizes loopback URL hostnames internally, so URL-origin comparison alone incorrectly rejected 127.0.0.1 browser requests; real HTTP tests caught this and the fix preserves exact origin restrictions. These controls do not provide authentication or authorize deployment.

Keep all JSON outcomes uncached. Use 201/400/422 for milestone behavior, 403 for origin/host denial, 413 for excessive bodies, 415 for unsupported media, and safe 500 with request ID for unexpected errors. Field errors contain only known fields or _form; do not echo unrecognized key names or raw input. Preserve existing sanitized logging.

HTTP checks now deliberately create synthetic clients and can be rerun against nonempty memory. Replace the Day 3 POST-405 expectation with actual creation/validation checks; keep unsupported PUT/PATCH/DELETE and the framework TRACE patch checks. Do not add a public test seed/reset endpoint or a database to simplify tests.

## 2026-10-18 - Complete authorized Week 1 technical scope

User confirmed "Yes—finish Week 1" after the assistant clarified Days 5-7 with learning questions skipped. Complete those days in order on this date; do not repeatedly request approval already granted. Keep independent rebuild/explanation unverified rather than treating AI-written code as learner evidence. This approval does not authorize Week 2, another push or deployment.

Keep /clients as a server page containing one interactive client workspace. Browser fetches the existing GET/POST API; the server page does not make HTTP calls back to itself. Store/service remain server-only. Share Zod input rules and allowlisted field-error formatting; validate response JSON at runtime before rendering. Keep the current Client type and project structure.

Omit blank optional browser fields, especially email. Avoid HTML maxLength because its UTF-16 counting would reject valid 120-emoji names accepted by installed Zod's Unicode code-point rule. Shared validation and actual browser/server boundary tests enforce the limits instead.

Use abort controllers to disregard stale GETs and cancel requests on unmount. Disable pending controls and guard submissions synchronously. Never automatically replay a POST: a lost response can leave a successful write uncertain. Preserve input on failure, and advise refreshing first. A confirmed creation is merged immediately and stays visible if its following refresh fails. React renders all input as text; no HTML injection API is used.

Pin Playwright 1.64.1 as a development dependency and run installed Chrome headless. Use real API calls for successful creation/reload, controlled HTTP responses for UI errors, and one worker. Run HTTP and browser suites sequentially per server because both write fake fixtures. Test artifacts stay ignored. Remove starter Google fonts and use system fonts so production builds do not fetch font files.

Production browser testing reproduced stale starter CSS despite a successful build. Fetched CSS lacked current selectors and computed layout overflowed. Following installed Next 16.4.2 documentation, disable persistent Turbopack caches for both build/dev. Rebuild then verify served CSS and browser behavior. This is a reproducible local workaround with slower fresh compilation, not a claim that the upstream cache bug is fixed; revisit only after a tested upgrade.

Verify current local work in a fresh temporary copy, including untracked intended source files, with a frozen install/build. Do not call it a fresh GitHub clone: remote main is still the earlier Day 3 publication. Keep the client/project relationship sketch as documentation only.
