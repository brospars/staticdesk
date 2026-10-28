import type { H3Event } from 'h3'

import type { PublicSite } from './site'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Verifies a Cloudflare Turnstile token. Returns false on any failure. */
export async function verifyTurnstile(
  token: string | undefined,
  secret: string,
  ip?: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip) body.set('remoteip', ip)
    const response = await fetcher(VERIFY_URL, { method: 'POST', body })
    if (!response.ok) return false
    const result = await response.json() as { success?: boolean }
    return result.success === true
  }
  catch {
    return false
  }
}

/** Throws 400 unless the token passes, when the site requires a Turnstile challenge. */
export async function enforceTurnstile(event: H3Event, site: PublicSite, token: string | undefined) {
  const config = useRuntimeConfig(event)
  if (!site.settings.turnstile || !config.turnstileSecretKey) return
  const ip = getRequestIP(event, { xForwardedFor: Boolean(config.trustProxy) })
  if (!await verifyTurnstile(token, String(config.turnstileSecretKey), ip)) {
    throw createError({ statusCode: 400, statusMessage: 'The anti-spam challenge failed, please try again' })
  }
}
