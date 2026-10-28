import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Counts a hit in a fixed window and throws 429 once the bucket exceeds `max`.
 * Fails open if the database call errors, so an outage never blocks visitors.
 */
export async function enforceRateLimit(event: H3Event, bucket: string, windowSeconds: number, max: number) {
  const { data: allowed, error } = await serverSupabaseServiceRole(event)
    .rpc('hit_rate_limit', { bucket, window_seconds: windowSeconds, max_hits: max })

  if (error) {
    console.error('[rate-limit] check failed', error.message)
    return
  }
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', windowSeconds)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests, please try again later' })
  }
}
