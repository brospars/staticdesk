import { z } from 'zod'

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
