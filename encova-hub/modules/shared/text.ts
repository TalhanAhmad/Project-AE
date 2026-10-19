// PostgreSQL text cannot store U+0000. Reject malformed UTF-16 too, so the
// driver cannot silently replace an unpaired surrogate during UTF-8 encoding.
export function isDatabaseText(value: string): boolean {
  return !value.includes("\u0000") && value.isWellFormed();
}

export const databaseTextMessage = "Use valid text without null characters.";
