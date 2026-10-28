import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/** Checks the bearer token of a scheduled job (CRON_SECRET, sent by Vercel Cron). Throws 401. */
export function requireCronSecret(event: H3Event) {
  const secret = String(useRuntimeConfig(event).cronSecret || process.env.CRON_SECRET || '')
  const header = getRequestHeader(event, 'authorization')
  if (!secret || !header) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(header)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}
