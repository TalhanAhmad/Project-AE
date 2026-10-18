# Encova Hub

Encova Hub is a learning project for an internal agency tool. We are learning how a browser, a Next.js server, and application rules work together.

## Current work

Week 1 has seven milestone days. Days 1-3 are implemented and checked: setup, TypeScript practice, and reading clients through an API. Learning questions were explicitly skipped at the user's request; independent understanding is not verified. The home page still shows the generated starter. POST and the client form are future work.

This week's goal is a local client list and form with server validation and temporary server memory storage. The read-only memory store now exists and starts empty. Use fake data only. Memory can reset during development or differ between server processes. PostgreSQL replaces it in week two.

Database setup, authentication, project/task features, and public deployment are outside week one.

## Where files live

- `encova-hub/`: the Next.js application and its pinned pnpm lockfile.
- `docs/README.md`: guide to the plan, records, and supplied source documents.
- `docs/progress.md`: the current day, status, and exact next task.
- `docs/days/`: actual work, checks, and learning evidence for each day.
- `docs/decisions.md`: choices and their reasons.
- `encova-hub/learning/README.md`: Day 2 TypeScript examples and how to run them.

## Run the app on Windows

Use Node.js 24 (verified with 24.19.0), npm, and Git. Run these commands from the project root. `npx.cmd` runs the pinned pnpm version without installing pnpm globally.

```powershell
Set-Location 'D:\AE project\encova-hub'
npx.cmd --yes pnpm@10.34.7 install --frozen-lockfile
npx.cmd --yes pnpm@10.34.7 dev
```

Open http://127.0.0.1:3000. Keep that terminal open while using the app. Press Ctrl+C in that terminal to stop it. If port 3000 is busy, use the local address printed by Next.js or stop the existing development server. The first install needs internet access; the starter fonts can also require internet on first compilation.

No database, account, or environment secrets are required for Day 1.

## Check the app

Run these from `encova-hub/` in another terminal:

```powershell
npx.cmd --yes pnpm@10.34.7 exec tsc --noEmit
npx.cmd --yes pnpm@10.34.7 lint
npx.cmd --yes pnpm@10.34.7 test
```

With the dev server running, `npx.cmd --yes pnpm@10.34.7 test:http` runs 16 real HTTP checks. These describe the current Day 3 read-only API; update the POST expectations when Day 4 adds client creation.

With the development server running, check its response:

```powershell
(Invoke-WebRequest 'http://127.0.0.1:3000' -UseBasicParsing).StatusCode
```

The expected HTTP status is 200. Check actual results before recording success. The production build was verified with `npx.cmd --yes pnpm@10.34.7 build`. Current tests cover Day 2 helpers and Day 3 client reads; POST validation tests will be added when that feature exists. Dev/start scripts bind to 127.0.0.1 by default.

## Read clients (Day 3)

Open http://127.0.0.1:3000/api/clients, or inspect it from PowerShell:

```powershell
Invoke-RestMethod 'http://127.0.0.1:3000/api/clients' | ConvertTo-Json
```

The fresh server returns HTTP 200 with `{"data":[]}`. The response is JSON and is not cached. The route calls `listClients`, which reads the server-only store and returns explicit client fields. Tests also check populated fake data without seeding the running server. Returned copies protect stored records from accidental changes.

POST currently returns 405; client creation begins on Day 4. There is no authentication yet, so keep this fake-data exercise local. Data is disposable, and restarting the server or using a different process can reset or change it.

`pnpm test` runs 28 checks for Day 2 and Day 3, including safe failure responses. The test command sets the Node `react-server` condition so server-only modules can run in a server test context. Normal Next.js builds enforce their separation from Client Components.

Unexpected storage failures return a generic JSON 500 with a request ID, no-store caching, and no internal details. A project-maintained pnpm patch for Next.js 16.4.2 rejects TRACE before the framework's request adapter can fail. The patch is registered in `encova-hub/pnpm-workspace.yaml` and must be reviewed when upgrading Next.js. See the [security review](docs/security-review.md) for its scope and verification.

Read the [security review](docs/security-review.md) for repeated-check results and one remaining unpatched advisory in development lint tooling. The production dependency audit reports zero known advisories; the full audit still reports that development issue.

## Three responsibilities

- A page displays the interface and collects input.
- An API handler receives an HTTP request, reads and validates input, calls a service, and returns an HTTP response.
- A service contains application rules and coordinates work with storage.

The app has a starter page and a read-only client API handler, service, and store. Client creation and interface work are still planned. Understanding is separate from whether code runs; the learner's questions were explicitly waived and are not recorded as verified.

## Git

Repository: [Project-AE on GitHub](https://github.com/TalhanAhmad/Project-AE). After cloning it, enter `Project-AE/encova-hub/` to run the app commands above; the `D:\AE project` path shown earlier is this workspace's location.

Run `git status` from this project root or from `encova-hub/`. Both belong to one working tree, including `docs/`. Local Git metadata remains in `encova-hub/.git`; the root `.git` file points to it. This preserves the scaffold's history without moving folders. Future clones use the usual Git layout and do not need that local pointer.

Dependency folders, build output, local environment files, and generated TypeScript cache files are ignored. Review changes before making a commit. Do not push or deploy without an explicit request.
