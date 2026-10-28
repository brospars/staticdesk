import { z } from 'zod'

import { SUPPORTED_LOCALES } from './site-settings'

/** Accepts a site URL and normalizes it to its origin ("https://docs.acme.dev"). */
export const originSchema = z
  .url({ protocol: /^https?$/, error: 'Enter a URL starting with https://' })
  .transform(value => new URL(value).origin)

export const siteSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  origin: originSchema,
})

export type SiteInput = z.input<typeof siteSchema>
export type Site = z.output<typeof siteSchema>

const WILDCARD_ORIGIN = /^https?:\/\/\*\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d{1,5})?$/

/** An allowed origin: an exact origin, or a wildcard subdomain such as https://*.acme.dev. */
export const allowedOriginSchema = z.string().trim().toLowerCase().transform((value, context) => {
  if (WILDCARD_ORIGIN.test(value)) return value
  // URL() accepts "*" in host names, so anything else with a "*" is invalid.
  const parsed = value.includes('*') ? null : originSchema.safeParse(value)
  if (parsed?.success) return parsed.data
  context.addIssue({ code: 'custom', message: `"${value}" is not a valid origin` })
  return z.NEVER
})

/** Site settings form in the dashboard. */
export const siteSettingsFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  allowedOrigins: z.array(allowedOriginSchema).max(50, 'Up to 50 origins'),
  locale: z.enum(SUPPORTED_LOCALES).nullable(),
  themeMode: z.enum(['auto', 'light', 'dark']),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex color such as #4f46e5').nullable(),
  allowLocalhost: z.boolean(),
  turnstile: z.boolean(),
})

export type SiteSettingsFormInput = z.input<typeof siteSettingsFormSchema>
export type SiteSettingsForm = z.output<typeof siteSettingsFormSchema>
