import { isOriginAllowed } from '@staticdesk/core'

import type { PublicSite } from './site'

export type CorsDecision =
  | { allowed: true, headers: Record<string, string> }
  | { allowed: false }

/**
 * Decides whether a cross-origin request to a site's public API is allowed.
 * GET requests without an Origin header (same-origin or server-side) are
 * allowed: they only read public configuration. Writes require an allowed Origin.
 */
export function corsDecision(method: string, origin: string | undefined, site: PublicSite): CorsDecision {
  if (!origin) {
    return method === 'GET' ? { allowed: true, headers: {} } : { allowed: false }
  }

  if (!isOriginAllowed(origin, site.allowedOrigins, { allowLocalhost: site.settings.allowLocalhost })) {
    return { allowed: false }
  }

  return {
    allowed: true,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin',
    },
  }
}
