# Deployment, logs, and recovery guide

This guide is for Encova Hub's private fake-data demo. Do not use it with real client data until backup retention, access ownership, and restore authorization are agreed.

## Production configuration

Vercel Production has a Ready deployment for `https://encova-hub.vercel.app`. Required application variables are `DATABASE_URL`, `DATABASE_URL_UNPOOLED` for reviewed migrations, `AUTH_SECRET`, and `APP_ORIGIN`. `LOG_LEVEL` is optional and defaults to `info`.

Secrets stay in Vercel or ignored local environment files. Never put a database URL, password, OAuth secret, session token, or real client data in Git, a browser variable, a log, or a support message.

## Logs and health

Application failures write JSON logs with a timestamp, level, action, request ID, error code, and duration when available. Request bodies, stack traces, passwords, tokens, and connection strings are intentionally excluded.

Use Vercel's private deployment logs for an incident. Search using a request ID shown in a safe `500` or `503` API response. The endpoint below is deliberately small and unauthenticated; it exposes no configuration or database contents.

```powershell
Invoke-WebRequest https://encova-hub.vercel.app/api/health | Select-Object StatusCode,Content
```

Expected result: HTTP 200 and `{"status":"ok"}`. A 503 means the application cannot reach its dependency; inspect private logs using its request ID.

## Release procedure

1. Run `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm test:integration`.
2. Run `corepack pnpm build`.
3. Ask the database operator to create a provider backup or restore point and confirm it completed.
4. Review any new migration. It must be backward-compatible with the current deployed code.
5. Apply it with the reviewed production migration command using the migration account, never `db:reset` or fake-data seed commands.
6. Deploy the application code.
7. Run `/api/health`, sign in with a controlled account, read an allowed project, and confirm an unrelated project is still hidden.
8. Check private Vercel logs for request failures and record the deployment URL, migration, and smoke-test result.

## Failed release and rollback

If the code deployment fails before database changes, redeploy the last Ready compatible deployment or revert the Git commit and deploy the revert. Do not assume a database migration can be rolled back automatically.

If a migration already ran, prefer a forward-compatible fix. Restore only after the data owner confirms the restore point, target, expected data loss, and user impact. Restore into a separate database first and verify it there.

## Local restore drill

The completed local drill uses only the loopback development database and a new random `encova_restore_*` database. It never contacts Vercel, Neon, or production.

```powershell
corepack pnpm db:verify-local-restore
```

It creates a PostgreSQL custom-format backup, restores it into the temporary database, compares counts for activity logs, clients, comments, projects, tasks, and users, verifies that the runtime account can read projects, then removes the temporary database and backup file. It does not prove a real production restore.

## Production restore rehearsal

Use the database provider's documented backup or point-in-time restore interface to create a separate database or branch. Point an isolated test deployment at it with separate secrets. Verify table counts, a controlled login, an allowed project read, and a denied unrelated-project read. Only then decide whether a production cutover is necessary.
