import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { ContactSubmittedPayload } from '@staticdesk/core'
import { serverSupabaseClient } from '#supabase/server'

const paramsSchema = z.object({ id: z.guid() })

// Sends a sample contact message to a webhook. RLS restricts webhooks to owners and admins.
export default defineEventHandler(async (event): Promise<DeliveryResult> => {
  await requireUser(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const supabase = await serverSupabaseClient(event)

  const { data: webhook } = await supabase
    .from('webhooks')
    .select('id, kind, url, secret, sites(id, name)')
    .eq('id', id)
    .maybeSingle()
  if (!webhook?.sites) throw createError({ statusCode: 404, statusMessage: 'Webhook not found' })

  await enforceRateLimit(event, `webhook-test:${webhook.id}`, 60, 10)

  const payload: ContactSubmittedPayload = {
    type: 'contact.submitted',
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    site: { id: webhook.sites.id, name: webhook.sites.name },
    widget: null,
    threadId: '00000000-0000-0000-0000-000000000000',
    contact: { email: 'ada@example.com', name: 'Ada Lovelace' },
    message: 'This is a test message from StaticDesk.',
    fields: [{ id: 'company', label: 'Company', value: 'Analytical Engines Ltd' }],
    page: { id: '/', url: null },
  }
  return sendWebhook(event, webhook, payload)
})
