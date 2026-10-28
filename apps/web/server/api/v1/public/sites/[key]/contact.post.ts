import { publicContactRequestSchema } from '@staticdesk/core'

// Contact form submissions from the widget: the message lands in the inbox.
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const site = usePublicSite(event)
  const parsed = publicContactRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission', data: parsed.error.flatten().fieldErrors })
  }

  await submitContactMessage(event, site, parsed.data)

  setResponseStatus(event, 201)
  return { ok: true }
})
