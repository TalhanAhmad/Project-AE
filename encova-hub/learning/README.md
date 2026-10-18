# Day 2: TypeScript practice

From the app folder, run the examples using the installed Node.js 24:

```powershell
node learning/day-02.mts
```

Node runs this file by removing its type annotations. It does not check types. Run the actual compiler separately:

```powershell
npx.cmd --yes pnpm@10.34.7 exec tsc --noEmit
npx.cmd --yes pnpm@10.34.7 lint
npx.cmd --yes pnpm@10.34.7 test
```

- `modules/clients/types.ts` describes a client: ID, name, optional contact fields, and timestamps.
- `types/domain.ts` lists allowed roles, statuses, and priorities from the architecture. No related feature modules are implemented.
- `day-02.mts` demonstrates typed function inputs and outputs, missing optional fields, unions, checking unknown values, and async/await.

Read the examples in order:

1. `formatClientLabel` uses a fallback when company is missing.
2. `readPracticeName` checks an unknown object before reading its name.
3. `describeNameResult` checks `ok` to decide which union fields are safe to use.
4. `getPracticeClientLabel` returns a Promise, and `await` reads its result.

Types help the compiler catch mistakes in our code. Incoming JSON can still contain anything because TypeScript types do not run on the server. Real request validation will be added with Zod on Day 4. The small name check here is only a practice example: it does not check email, length limits, or unknown fields.

All example data is fake. Running this script prints examples only; it does not store data, create an API, or change the app's page.

The name exercise rejects arrays, inherited names, and getter properties. Importing the helpers does not run the demo. `day-02.test.mts` has 18 regression checks and uses Node's built-in test runner; no extra test package is needed. The TypeScript option `allowImportingTsExtensions` lets the tests import the actual `.mts` helper file while `noEmit` stays enabled.

The user asked to skip learning questions. These examples are assistant-written; independent understanding has not been verified.

Day 3 and its follow-up review add ten store/service/GET checks in `tests/clients.test.mts`, making 28 total unit checks. A separate `pnpm test:http` command runs 16 checks against a running local server. The unit test command uses Node's `react-server` condition to load server-only modules. Read [the Day 3 record](../../docs/days/day-03.md) for actual results and [the project README](../../README.md) for the live read endpoint.
