# Week 7 — Session 4: Local restore drill

**Status:** Completed (technical work; independent learning not verified).

## Goal and work completed

Added and ran `db:verify-local-restore`. It creates a custom-format backup of the loopback development database, restores it into a generated local database, compares six important table counts, confirms the runtime account can read projects, and removes the temporary database and backup.

## Files created or changed

- `encova-hub/scripts/verify-local-restore.ps1`
- `encova-hub/package.json`

## Checks run and actual results

The local backup and separate-database restore passed. Restored activity-log, client, comment, project, task, and user counts matched the source. The runtime account successfully read projects. The temporary restore database and dump were removed.

## What I have demonstrated that I understand

A restore is safer when it is tested in a separate database and verified before it affects an active application. Independent learning confirmation was not provided.

## Remaining tasks or problems

No technical Session 4 tasks remain.

## Exact point to resume

Run the final checks, security review, and report.
