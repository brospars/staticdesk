import { createHmac } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { H3Event } from 'h3'
import { isAllowedWebhookUrl, type ContactSubmittedPayload, type WebhookKind } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

export interface WebhookTarget {
  id: string
  kind: WebhookKind
  url: string
  secret: string
}

export interface WebhookRequest {
  body: string
  headers: Record<string, string>
}

/** StaticDesk-Signature header: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">. */
export function signWebhook(secret: string, body: string, timestamp: number): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

function summary(payload: ContactSubmittedPayload) {
  const from = payload.contact.name ? `${payload.contact.name} (${payload.contact.email})` : payload.contact.email
  const lines = payload.fields.map(field => `${field.label}: ${field.value}`)
  if (payload.attachments.length) lines.push(`Attachments: ${payload.attachments.map(file => file.name).join(', ')}`)
  return { from, lines }
}

// Slack mrkdwn treats &, < and > as control characters.
const slackEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Builds the HTTP request for a webhook: Slack and Discord get a chat message, custom URLs a signed JSON body. */
export function buildWebhookRequest(target: WebhookTarget, payload: ContactSubmittedPayload, now = Date.now()): WebhookRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'StaticDesk-Webhooks/1.0',
  }
  const { from, lines } = summary(payload)

  if (target.kind === 'slack') {
    const text = [
      `*New message on ${slackEscape(payload.site.name)}* from ${slackEscape(from)}`,
      ...lines.map(line => `• ${slackEscape(line)}`),
      `>${slackEscape(payload.message.slice(0, 2500)).replace(/\n/g, '\n>')}`,
    ].join('\n')
    return { body: JSON.stringify({ text }), headers }
  }

  if (target.kind === 'discord') {
    const content = [
      `**New message on ${payload.site.name}** from ${from}`,
      ...lines.map(line => `- ${line}`),
      payload.message,
    ].join('\n').slice(0, 2000)
    // Never let visitor text ping @everyone, roles or users.
    return { body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), headers }
  }

  const body = JSON.stringify(payload)
  return {
    body,
    headers: {
      ...headers,
      'StaticDesk-Event': payload.type,
      'StaticDesk-Delivery': payload.id,
      'StaticDesk-Signature': signWebhook(target.secret, body, Math.floor(now / 1000)),
    },
  }
}

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(?:1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./]

/** Whether an IP address belongs to a loopback, private, link-local or otherwise internal range. */
export function isPrivateAddress(address: string): boolean {
  const mapped = address.toLowerCase().replace(/^::ffff:/, '')
  if (isIP(mapped) === 4) return PRIVATE_V4.some(range => range.test(mapped))
  return mapped === '::' || mapped === '::1' || /^f[cd]/.test(mapped) || /^fe[89ab]/.test(mapped)
}

export interface DeliveryResult {
  ok: boolean
  status: number | null
  error: string | null
}

/**
 * Sends a webhook request. Refuses hosts that resolve to internal addresses,
 * does not follow redirects and gives up after 5 seconds.
 */
export async function deliverWebhook(target: WebhookTarget, request: WebhookRequest, fetcher: typeof fetch = fetch): Promise<DeliveryResult> {
  try {
    if (!isAllowedWebhookUrl(target.url)) return { ok: false, status: null, error: 'URL not allowed' }
    const addresses = await lookup(new URL(target.url).hostname, { all: true })
    if (addresses.some(({ address }) => isPrivateAddress(address))) {
      return { ok: false, status: null, error: 'The host resolves to a private address' }
    }

    const response = await fetcher(target.url, {
      method: 'POST',
      body: request.body,
      headers: request.headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(5_000),
    })
    return response.ok
      ? { ok: true, status: response.status, error: null }
      : { ok: false, status: response.status, error: `HTTP ${response.status}` }
  }
  catch (cause) {
    const error = cause instanceof Error ? (cause.name === 'TimeoutError' ? 'Timed out after 5 seconds' : cause.message) : 'Delivery failed'
    return { ok: false, status: null, error: error.slice(0, 500) }
  }
}

/** Delivers a payload to one webhook and records the outcome on it. */
export async function sendWebhook(event: H3Event, target: WebhookTarget, payload: ContactSubmittedPayload): Promise<DeliveryResult> {
  const result = await deliverWebhook(target, buildWebhookRequest(target, payload))
  const { error } = await serverSupabaseServiceRole(event)
    .from('webhooks')
    .update({ last_delivery_at: new Date().toISOString(), last_status: result.status, last_error: result.error })
    .eq('id', target.id)
  if (error) console.error('[webhooks] could not record the delivery', error.message)
  return result
}

/** Sends a new contact message to every enabled webhook of the site. */
export async function dispatchContactWebhooks(event: H3Event, siteId: string, payload: ContactSubmittedPayload) {
  const { data: webhooks, error } = await serverSupabaseServiceRole(event)
    .from('webhooks')
    .select('id, kind, url, secret')
    .eq('site_id', siteId)
    .eq('enabled', true)
    .contains('events', [payload.type])
  if (error) {
    console.error('[webhooks] could not load the webhooks', error.message)
    return
  }
  await Promise.all(webhooks.map(webhook => sendWebhook(event, webhook, payload)))
}
