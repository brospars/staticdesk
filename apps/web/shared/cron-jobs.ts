/**
 * Scheduled jobs: declared as Vercel Crons in nuxt.config.ts, and run by the
 * built-in scheduler when NUXT_SCHEDULER=internal (Docker, any Node server).
 * Schedules are UTC and use a subset of the cron syntax: minute and hour
 * fields with *, a number or a step (asterisk/5); the other fields must be *.
 */
export const CRON_JOBS = [
  // Daily inbox digest.
  { path: '/api/cron/digest', schedule: '0 7 * * *' },
  // Abandoned attachment uploads.
  { path: '/api/cron/cleanup', schedule: '0 3 * * *' },
  // Delayed auto-replies and follow-up reminders (needs a Vercel plan allowing frequent crons).
  { path: '/api/cron/automation', schedule: '*/5 * * * *' },
] as const

function fieldMatches(field: string, value: number): boolean {
  if (field === '*') return true
  const step = field.match(/^\*\/(\d+)$/)
  if (step) return value % Number(step[1]) === 0
  return /^\d+$/.test(field) && Number(field) === value
}

/** Whether a schedule of this subset is due at the given minute (UTC). */
export function isCronDue(schedule: string, date: Date): boolean {
  const [minute, hour, ...rest] = schedule.trim().split(/\s+/)
  if (!minute || !hour || rest.length !== 3 || rest.some(field => field !== '*')) {
    throw new Error(`Unsupported cron schedule: ${schedule}`)
  }
  return fieldMatches(minute, date.getUTCMinutes()) && fieldMatches(hour, date.getUTCHours())
}
