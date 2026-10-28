/** Humans need at least this long to fill in a form. */
export const MIN_FILL_TIME_MS = 2_000

/**
 * Cheap bot checks: a filled honeypot or an implausibly fast submission.
 * Plain HTML forms cannot measure the fill time and leave elapsedMs undefined.
 */
export function isLikelyBot(input: { website?: string, elapsedMs?: number }): boolean {
  return Boolean(input.website?.trim()) || (input.elapsedMs !== undefined && input.elapsedMs < MIN_FILL_TIME_MS)
}
