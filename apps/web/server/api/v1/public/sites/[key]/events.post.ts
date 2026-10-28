import { publicEventSchema } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// Analytics events from the widget (page views, widget opens). Sent with
// navigator.sendBeacon, so the body may arrive as text/plain.
export default defineEventHandler(async (event) => {
  const site = usePublicSite(event)

  const raw = await readRawBody(event, 'utf8')
  let json: unknown
  try {
    json = JSON.parse(raw ?? '')
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }
  const parsed = publicEventSchema.safeParse(json)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid event' })
  const payload = parsed.data

  await enforceRateLimit(event, `events:${site.id}:${visitorFingerprint(event, site.id)}`, 60, 120)

  const widgetId = site.widgets.some(widget => widget.id === payload.widgetId) ? payload.widgetId : null
  const { error } = await serverSupabaseServiceRole(event).from('events').insert({
    workspace_id: site.workspaceId,
    site_id: site.id,
    widget_id: widgetId,
    type: payload.type,
    page_id: payload.pageId,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not record the event' })

  setResponseStatus(event, 204)
  return ''
})
