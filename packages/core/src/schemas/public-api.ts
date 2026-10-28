import { z } from 'zod'

import type { WidgetKind } from '../embed/snippet'
import { contactSubmissionSchema } from './contact'
import type { Locale } from './site-settings'

/** Response of GET /api/v1/public/sites/:key/config. */
export interface PublicSiteConfig {
  site: { name: string }
  locale: Locale | null
  theme: { primaryColor: string | null, mode: 'auto' | 'light' | 'dark' }
  /** Cloudflare Turnstile site key when the site requires a challenge. */
  turnstileSiteKey: string | null
  widgets: PublicWidget[]
}

export interface PublicWidget {
  id: string
  kind: WidgetKind
  config: Record<string, unknown>
}

const pageFields = {
  pageId: z.string().trim().min(1).max(500),
  pageUrl: z.url().max(2000).optional(),
}

/** POST /api/v1/public/sites/:key/events. Submissions are recorded server-side. */
export const publicEventSchema = z.object({
  type: z.enum(['view', 'open']),
  widgetId: z.uuid().optional(),
  ...pageFields,
})

export type PublicEvent = z.infer<typeof publicEventSchema>

/** Anti-spam fields sent with every visitor submission. */
export const antiSpamSchema = z.object({
  /** Honeypot: hidden field that humans leave empty. */
  website: z.string().max(500).optional(),
  /** Milliseconds between the form being shown and submitted. */
  elapsedMs: z.number().int().nonnegative().max(86_400_000),
  turnstileToken: z.string().max(4096).optional(),
})

/** POST /api/v1/public/sites/:key/contact */
export const publicContactRequestSchema = contactSubmissionSchema.extend({
  widgetId: z.uuid().optional(),
  ...pageFields,
}).extend(antiSpamSchema.shape)

export type PublicContactRequest = z.infer<typeof publicContactRequestSchema>
