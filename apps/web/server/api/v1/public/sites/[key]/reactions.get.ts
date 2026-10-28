import { publicReactionsQuerySchema, type PublicReactionCounts } from '@staticdesk/core'

// Public counters of a page's emoji reactions.
export default defineEventHandler(async (event): Promise<PublicReactionCounts> => {
  const site = usePublicSite(event)
  const parsed = publicReactionsQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid page' })

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { counts: await reactionCounts(event, site.id, parsed.data.pageId) }
})
