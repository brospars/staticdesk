import { publicContactRequestSchema } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// Contact form submissions: anti-spam checks, then the message lands in the inbox.
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const site = usePublicSite(event)
  const parsed = publicContactRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission', data: parsed.error.flatten().fieldErrors })
  }
  const submission = parsed.data

  // Bots get a success response so they do not adapt; nothing is stored.
  if (isLikelyBot(submission)) {
    setResponseStatus(event, 201)
    return { ok: true }
  }

  const fingerprint = visitorFingerprint(event, site.id)
  await enforceRateLimit(event, `contact:${site.id}:${fingerprint}`, 600, 5)
  await enforceRateLimit(event, `contact:${site.id}`, 3600, 200)

  const config = useRuntimeConfig(event)
  if (site.settings.turnstile && config.turnstileSecretKey) {
    const ip = getRequestIP(event, { xForwardedFor: Boolean(config.trustProxy) })
    if (!await verifyTurnstile(submission.turnstileToken, String(config.turnstileSecretKey), ip)) {
      throw createError({ statusCode: 400, statusMessage: 'The anti-spam challenge failed, please try again' })
    }
  }

  const { error } = await serverSupabaseServiceRole(event).rpc('submit_contact', {
    site_id: site.id,
    email: submission.email,
    message: submission.message,
    page_id: submission.pageId,
    widget_id: submission.widgetId,
    name: submission.name,
    page_url: submission.pageUrl,
  })
  if (error) {
    console.error('[contact] submit_contact failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not send your message' })
  }

  setResponseStatus(event, 201)
  return { ok: true }
})
