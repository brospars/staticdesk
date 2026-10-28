import { createHmac, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

let fallbackSecret: string | undefined

function fingerprintSecret(event: H3Event): string {
  const configured = String(useRuntimeConfig(event).fingerprintSecret)
  if (configured) return configured

  if (!fallbackSecret) {
    // Still private, but differs per server instance and restart, which weakens
    // rate limiting across instances. Set NUXT_FINGERPRINT_SECRET in production.
    console.warn('[staticdesk] NUXT_FINGERPRINT_SECRET is not set; using a random per-process secret')
    fallbackSecret = randomBytes(32).toString('hex')
  }
  return fallbackSecret
}

/**
 * Daily, per-site visitor fingerprint: an HMAC of the IP and user agent.
 * The IP itself is never stored, and fingerprints cannot be linked across sites
 * or across days.
 */
export function computeFingerprint(secret: string, parts: { siteId: string, ip: string, userAgent: string, day: string }) {
  return createHmac('sha256', secret)
    .update(`${parts.day}|${parts.siteId}|${parts.ip}|${parts.userAgent}`)
    .digest('base64url')
    .slice(0, 32)
}

export function visitorFingerprint(event: H3Event, siteId: string): string {
  const trustProxy = Boolean(useRuntimeConfig(event).trustProxy)
  return computeFingerprint(fingerprintSecret(event), {
    siteId,
    ip: getRequestIP(event, { xForwardedFor: trustProxy }) ?? 'unknown',
    userAgent: getRequestHeader(event, 'user-agent') ?? '',
    day: new Date().toISOString().slice(0, 10),
  })
}
