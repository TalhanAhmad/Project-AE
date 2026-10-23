export const activityActions = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_STATUS_CHANGED",
  "TASK_DELETED",
  "COMMENT_CREATED",
  "COMMENT_UPDATED",
  "COMMENT_DELETED",
] as const;

export type ActivityAction = (typeof activityActions)[number];

// History records intentionally contain only small, allowlisted metadata.
// User-written text, credentials, and session data never belong in activity details.
export type ActivityDetails = Record<string, boolean | number | string | null>;
