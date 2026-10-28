import { publicAuthorTokenSchema, type PublicReactionCounts } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// Removes a visitor's reaction and returns the page's new counters.
export default defineEventHandler(async (event): Promise<PublicReactionCounts> => {
  const site = usePublicSite(event)
  const id = routeId(event)
  const input = await readValidated(event, publicAuthorTokenSchema)
  requireReactionToken(event, id, input.token)

  const { data, error } = await serverSupabaseServiceRole(event)
    .from('reactions')
    .delete()
    .eq('id', id)
    .eq('site_id', site.id)
    .select('page_id')
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not remove your reaction' })
  // Already gone: nothing to update on the page.
  const pageId = data[0]?.page_id
  return { counts: pageId ? await reactionCounts(event, site.id, pageId) : {} }
})
