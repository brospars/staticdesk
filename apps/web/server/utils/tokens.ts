import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Random URL-safe secret (256 bits). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Tokens are stored hashed; only the emailed link contains the secret. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time comparison of a token with its stored hash or expected value. */
export function tokenMatches(token: string, expected: string | null | undefined, hash = true): boolean {
  if (!expected) return false
  const actual = Buffer.from(hash ? hashToken(token) : token)
  const wanted = Buffer.from(expected)
  return actual.length === wanted.length && timingSafeEqual(actual, wanted)
}
