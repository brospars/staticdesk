import { randomUUID } from 'node:crypto'
import { commentNeedsApproval, publicCommentRequestSchema, type PublicCommentPosted } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// A visitor posts a comment or a reply, with a name or anonymously. Depending on
// the widget's rules it is published right away or waits for a moderator.
export default defineEventHandler(async (event): Promise<PublicCommentPosted> => {
  const site = usePublicSite(event)
  const input = await readValidated(event, publicCommentRequestSchema)
  const widget = requireCommentsWidget(site, input.widgetId)

  const name = input.name?.trim() || null
  if (!name && !widget.config.allowAnonymous) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request', data: { name: ['Enter your name'] } })
  }

  // Bots get a plausible response so they do not adapt; nothing is stored.
  if (isLikelyBot(input)) {
    setResponseStatus(event, 201)
    const now = new Date().toISOString()
    return {
      comment: { id: randomUUID(), parentId: input.parentId ?? null, author: name, body: input.body, deleted: false, createdAt: now, editedAt: null, replies: [] },
      status: 'pending',
    }
  }

  const fingerprint = visitorFingerprint(event, site.id)
  await enforceRateLimit(event, `comments:${site.id}:${fingerprint}`, 600, name ? 6 : 3)
  await enforceRateLimit(event, `comments:${site.id}`, 3600, 300)
  await enforceTurnstile(event, site, input.turnstileToken)

  const supabase = serverSupabaseServiceRole(event)

  // Two levels: a reply to a reply joins the thread of its parent.
  let parentId: string | null = null
  if (input.parentId) {
    const { data: parent } = await supabase
      .from('comments')
      .select('id, parent_id')
      .match({ id: input.parentId, site_id: site.id, page_id: input.pageId, status: 'approved' })
      .maybeSingle()
    if (!parent) throw createError({ statusCode: 400, statusMessage: 'The comment you reply to is no longer available' })
    parentId = parent.parent_id ?? parent.id
  }

  const status = commentNeedsApproval(widget.config, { anonymous: !name, body: input.body }) ? 'pending' : 'approved'
  const token = generateToken()
  const { data, error } = await supabase
    .from('comments')
    .insert({
      workspace_id: site.workspaceId,
      site_id: site.id,
      widget_id: widget.id,
      page_id: input.pageId,
      page_url: input.pageUrl,
      parent_id: parentId,
      is_anonymous: !name,
      author_name: name,
      body: input.body,
      status,
      edit_token_hash: hashToken(token),
      fingerprint_hash: fingerprint,
    })
    .select(COMMENT_COLUMNS)
    .single()
  if (error) {
    console.error('[comments] insert failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not post your comment' })
  }

  setResponseStatus(event, 201)
  return { comment: toPublicComment(data), status, token }
})
