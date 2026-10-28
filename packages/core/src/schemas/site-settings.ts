import { z } from 'zod'

export const SUPPORTED_LOCALES = ['en', 'fr'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i)

/**
 * Settings stored in sites.settings. Parsing is lenient: an invalid or missing
 * value falls back to its default instead of failing the whole object.
 */
export const siteSettingsSchema = z.object({
  /** Widget language; null means "detect from the visitor's browser". */
  locale: z.enum(SUPPORTED_LOCALES).nullable().catch(null),
  theme: z.object({
    primaryColor: hexColor.nullable().catch(null),
    mode: z.enum(['auto', 'light', 'dark']).catch('auto'),
  }).catch({ primaryColor: null, mode: 'auto' }),
  /** Accept requests from http://localhost and 127.0.0.1 (local previews). */
  allowLocalhost: z.boolean().catch(true),
  /** Require a Cloudflare Turnstile challenge on submissions. */
  turnstile: z.boolean().catch(false),
})

export type SiteSettings = z.output<typeof siteSettingsSchema>

export function parseSiteSettings(value: unknown): SiteSettings {
  return siteSettingsSchema.parse(typeof value === 'object' && value !== null ? value : {})
}
