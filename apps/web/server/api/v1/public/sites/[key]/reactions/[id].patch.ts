import { publicReactionCommentSchema } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// Adds the visitor's comment to their "helpful" or "unhelpful" vote.
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const site = usePublicSite(event)
  const id = routeId(event)
  const input = await readValidated(event, publicReactionCommentSchema)
  requireReactionToken(event, id, input.token)
  await enforceRateLimit(event, `reactions:${site.id}:${visitorFingerprint(event, site.id)}`, 600, 60)

  const { data, error } = await serverSupabaseServiceRole(event)
    .from('reactions')
    .update({ comment: input.comment })
    .eq('id', id)
    .eq('site_id', site.id)
    .in('kind', ['helpful', 'unhelpful'])
    .select('id')
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not save your comment' })
  if (!data.length) throw createError({ statusCode: 404, statusMessage: 'Reaction not found' })
  return { ok: true }
})
