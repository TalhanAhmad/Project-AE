# Week 7 — Session 3: Deployment and recovery guide

**Status:** Completed (technical work; independent learning not verified).

## Goal and work completed

Created the deployment and recovery guide. It defines private logs, the health check, release order, rollback choices, local restore drill, and the boundary between a rehearsal and a real production restore.

## Files created or changed

- `docs/deployment-recovery.md`

## Checks run and actual results

Read-only Vercel inspection confirmed the public alias is attached to a Ready production deployment. Variable names were inspected without pulling secret values. Required application variables are present; `LOG_LEVEL` is optional and currently uses its safe default.

## What I have demonstrated that I understand

Production recovery must first restore into a separate target and verify it before any cutover. Independent learning confirmation was not provided.

## Remaining tasks or problems

No technical Session 3 tasks remain.

## Exact point to resume

Run the local backup and restore drill.
