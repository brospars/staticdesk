import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SvixHeaders {
  id: string | undefined
  timestamp: string | undefined
  signature: string | undefined
}

const TOLERANCE_SECONDS = 5 * 60

/**
 * Verifies a webhook signed the Svix way (Resend webhooks): HMAC-SHA256 of
 * "<id>.<timestamp>.<body>" with the base64 key after the `whsec_` prefix,
 * sent as space-separated `v1,<base64>` signatures.
 */
export function verifySvixSignature(secret: string, headers: SvixHeaders, body: string, now = Date.now()): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = Buffer.from(createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64'))

  return signature.split(' ').some((candidate) => {
    const [version, value] = candidate.split(',')
    if (version !== 'v1' || !value) return false
    const actual = Buffer.from(value)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  })
}
