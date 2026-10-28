import type { H3Event } from 'h3'
import { parseSiteSettings, type SiteSettings, type WidgetKind } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

export interface PublicSite {
  id: string
  workspaceId: string
  name: string
  allowedOrigins: string[]
  settings: SiteSettings
  widgets: { id: string, kind: WidgetKind, config: unknown }[]
}

declare module 'h3' {
  interface H3EventContext {
    /** Site resolved by the public API middleware from the URL's public key. */
    publicSite?: PublicSite
  }
}

export const PUBLIC_KEY_PATTERN = /^pk_[a-z0-9]{8,64}$/

const SITE_TTL_MS = 30_000
const MISSING_TTL_MS = 10_000
const cache = new Map<string, { site: PublicSite | null, expires: number }>()

/**
 * Looks up a site by its public key, with a short in-memory cache: every widget
 * request needs it, and settings changes may take up to 30 seconds to apply.
 */
export async function findPublicSite(event: H3Event, publicKey: string): Promise<PublicSite | null> {
  if (!PUBLIC_KEY_PATTERN.test(publicKey)) return null

  const cached = cache.get(publicKey)
  if (cached && cached.expires > Date.now()) return cached.site

  const { data, error } = await serverSupabaseServiceRole(event)
    .from('sites')
    .select('id, workspace_id, name, allowed_origins, settings, widgets(id, kind, config, enabled)')
    .eq('public_key', publicKey)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not load the site' })

  const site: PublicSite | null = data && {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    allowedOrigins: data.allowed_origins,
    settings: parseSiteSettings(data.settings),
    widgets: data.widgets
      .filter(widget => widget.enabled)
      .map(({ id, kind, config }) => ({ id, kind, config })),
  }

  if (cache.size > 10_000) cache.clear()
  cache.set(publicKey, { site, expires: Date.now() + (site ? SITE_TTL_MS : MISSING_TTL_MS) })
  return site
}

/** The site resolved by the middleware; only valid on /api/v1/public/sites/:key/* routes. */
export function usePublicSite(event: H3Event): PublicSite {
  const site = event.context.publicSite
  if (!site) throw createError({ statusCode: 500, statusMessage: 'Public site not resolved' })
  return site
}
