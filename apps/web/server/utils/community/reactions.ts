import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

/** Public counters of the emoji reactions of a page. */
export async function reactionCounts(event: H3Event, siteId: string, pageId: string): Promise<Record<string, number>> {
  const { data, error } = await serverSupabaseServiceRole(event).rpc('reaction_counts', { site: siteId, page: pageId })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not load the reactions' })
  return data as Record<string, number>
}

/** Throws 403 unless the token is the one handed out when the reaction was posted. */
export function requireReactionToken(event: H3Event, id: string, token: string) {
  if (!tokenMatches(token, visitorToken(event, 'reaction', id), false)) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid token' })
  }
}
