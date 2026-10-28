import { COMMENTS_PAGE_SIZE, publicCommentsQuerySchema, type PublicComment, type PublicCommentsResponse } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// Published comments of a page: top-level comments, a page at a time, each with its replies.
export default defineEventHandler(async (event): Promise<PublicCommentsResponse> => {
  const site = usePublicSite(event)
  const parsed = publicCommentsQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid query' })
  const { pageId, widgetId, offset } = parsed.data
  const widget = requireCommentsWidget(site, widgetId)

  const supabase = serverSupabaseServiceRole(event)
  const page = { site_id: site.id, page_id: pageId, status: 'approved' as const }
  const [top, total] = await Promise.all([
    supabase
      .from('comments')
      .select(COMMENT_COLUMNS)
      .match(page)
      .is('parent_id', null)
      .order('created_at', { ascending: widget.config.sort === 'oldest' })
      .order('id')
      .range(offset, offset + COMMENTS_PAGE_SIZE), // One extra row tells whether there is more.
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .match(page)
      .is('deleted_at', null),
  ])
  if (top.error || total.error) throw createError({ statusCode: 500, statusMessage: 'Could not load the comments' })

  const rows = top.data.slice(0, COMMENTS_PAGE_SIZE)
  const replies = new Map<string, PublicComment[]>()
  if (rows.length) {
    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_COLUMNS)
      .match(page)
      .in('parent_id', rows.map(row => row.id))
      .is('deleted_at', null)
      .order('created_at')
      .limit(1000)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Could not load the comments' })
    for (const reply of data) {
      const list = replies.get(reply.parent_id!) ?? []
      list.push(toPublicComment(reply))
      replies.set(reply.parent_id!, list)
    }
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return {
    // Deleted comments stay as placeholders only while they have replies.
    comments: rows
      .map(row => toPublicComment(row, replies.get(row.id)))
      .filter(comment => !comment.deleted || comment.replies.length),
    total: total.count ?? 0,
    nextOffset: top.data.length > COMMENTS_PAGE_SIZE ? offset + COMMENTS_PAGE_SIZE : null,
  }
})
