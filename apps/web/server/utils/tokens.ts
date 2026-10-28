import { createHash, randomBytes } from 'node:crypto'

/** Random URL-safe secret (256 bits). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Tokens are stored hashed; only the emailed link contains the secret. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
