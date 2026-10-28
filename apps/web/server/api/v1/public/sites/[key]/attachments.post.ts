import { attachmentUploadRequestSchema, type AttachmentUploadResponse } from '@staticdesk/core'

// Prepares an attachment upload for a contact form that accepts files:
// the widget PUTs the file to the returned URL, then submits its id.
export default defineEventHandler(async (event): Promise<AttachmentUploadResponse> => {
  const site = usePublicSite(event)
  const parsed = attachmentUploadRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Invalid file' })
  }

  const form = resolveContactForm(site, parsed.data.widgetId)
  if (!form.widget || !form.config.attachments) {
    throw createError({ statusCode: 403, statusMessage: 'This form does not accept attachments' })
  }

  const fingerprint = visitorFingerprint(event, site.id)
  await enforceRateLimit(event, `attachments:${site.id}:${fingerprint}`, 600, 15)
  await enforceRateLimit(event, `attachments:${site.id}`, 3600, 300)

  setResponseStatus(event, 201)
  return createAttachmentUpload(event, site, parsed.data)
})
