import { z } from 'zod'

export const WEBHOOK_KINDS = ['custom', 'slack', 'discord'] as const
export type WebhookKind = (typeof WEBHOOK_KINDS)[number]

export const WEBHOOK_EVENTS = ['contact.submitted'] as const
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

const PRIVATE_HOST = /^(?:localhost|.*\.localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[.*\])$/i

/**
 * Whether a webhook may target this URL: HTTPS on a public host name.
 * The server also checks the resolved address before each delivery.
 */
export function isAllowedWebhookUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  }
  catch {
    return false
  }
  return url.protocol === 'https:' && !url.username && !url.password && !PRIVATE_HOST.test(url.hostname)
}

export const webhookUrlSchema = z.url({ protocol: /^https$/, error: 'Enter a URL starting with https://' })
  .max(2000)
  .refine(isAllowedWebhookUrl, 'Use a public HTTPS address')

/** Webhook form in the dashboard. */
export const webhookFormSchema = z.object({
  kind: z.enum(WEBHOOK_KINDS),
  url: webhookUrlSchema,
}).refine(({ kind, url }) => {
  const host = new URL(url).hostname
  if (kind === 'slack') return host === 'hooks.slack.com'
  if (kind === 'discord') return host === 'discord.com' || host === 'discordapp.com'
  return true
}, { message: 'This is not a webhook URL of the selected service', path: ['url'] })

export type WebhookFormInput = z.input<typeof webhookFormSchema>
export type WebhookForm = z.output<typeof webhookFormSchema>

/** Body of a custom webhook for a new contact message. */
export interface ContactSubmittedPayload {
  type: 'contact.submitted'
  /** Unique delivery id, also sent in the StaticDesk-Delivery header. */
  id: string
  createdAt: string
  site: { id: string, name: string }
  widget: { id: string, name: string } | null
  threadId: string
  contact: { email: string, name: string | null }
  message: string
  fields: { id: string, label: string, value: string }[]
  page: { id: string, url: string | null }
}
