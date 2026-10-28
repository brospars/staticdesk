import { COMMENT_EDIT_WINDOW_MINUTES, commentNeedsApproval, publicCommentEditSchema, type PublicCommentPosted } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// The author edits their comment, with the token they got when posting,
// within the edit window. An edit that breaks the rules waits for approval again.
export default defineEventHandler(async (event): Promise<PublicCommentPosted> => {
  const site = usePublicSite(event)
  const id = routeId(event)
  const input = await readValidated(event, publicCommentEditSchema)
  await enforceRateLimit(event, `comments:edit:${site.id}:${visitorFingerprint(event, site.id)}`, 600, 20)

  const comment = await findOwnComment(event, site.id, id, input.token)
  if (comment.deleted_at || comment.status === 'rejected' || comment.status === 'spam') {
    throw createError({ statusCode: 403, statusMessage: 'This comment can no longer be edited' })
  }
  if (Date.now() - Date.parse(comment.created_at) > COMMENT_EDIT_WINDOW_MINUTES * 60_000) {
    throw createError({ statusCode: 403, statusMessage: 'The edit window has closed' })
  }

  const widget = requireCommentsWidget(site, comment.widget_id ?? undefined)
  const status = comment.status === 'pending' || commentNeedsApproval(widget.config, { anonymous: comment.is_anonymous, body: input.body })
    ? 'pending'
    : 'approved'
  const { data, error } = await serverSupabaseServiceRole(event)
    .from('comments')
    .update({ body: input.body, status, edited_at: new Date().toISOString() })
    .eq('id', id)
    .select(COMMENT_COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not save your comment' })

  return { comment: toPublicComment(data), status }
})
