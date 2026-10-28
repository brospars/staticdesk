import { publicReactionRequestSchema, type PublicReactionPosted } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// A visitor reacts to a page: "helpful", "unhelpful" or an emoji. One reaction
// of each kind per visitor and page; voting "helpful" replaces "unhelpful" and
// the other way round. The token lets the visitor remove it or add a comment.
export default defineEventHandler(async (event): Promise<PublicReactionPosted> => {
  const site = usePublicSite(event)
  const input = await readValidated(event, publicReactionRequestSchema)
  if (!isReactionAllowed(site, input.kind, input.widgetId)) {
    throw createError({ statusCode: 400, statusMessage: 'This reaction is not enabled on this site' })
  }

  const fingerprint = visitorFingerprint(event, site.id)
  await enforceRateLimit(event, `reactions:${site.id}:${fingerprint}`, 600, 60)
  await enforceRateLimit(event, `reactions:${site.id}`, 3600, 5000)

  const supabase = serverSupabaseServiceRole(event)
  const row = { site_id: site.id, page_id: input.pageId, fingerprint_hash: fingerprint }
  let { data, error } = await supabase
    .from('reactions')
    .insert({ ...row, workspace_id: site.workspaceId, kind: input.kind })
    .select('id')
    .single()
  // Already reacted today: return the same reaction.
  if (error?.code === '23505') {
    ({ data, error } = await supabase.from('reactions').select('id').match({ ...row, kind: input.kind }).single())
  }
  if (error || !data) {
    console.error('[reactions] insert failed', error?.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not save your reaction' })
  }

  const opposite = input.kind === 'helpful' ? 'unhelpful' : input.kind === 'unhelpful' ? 'helpful' : null
  if (opposite) await supabase.from('reactions').delete().match({ ...row, kind: opposite })

  setResponseStatus(event, 201)
  return {
    id: data.id,
    token: visitorToken(event, 'reaction', data.id),
    counts: await reactionCounts(event, site.id, input.pageId),
  }
})
