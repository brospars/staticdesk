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
