import { createHmac, timingSafeEqual } from 'node:crypto'

export interface EmailAddress {
  name: string | null
  email: string
}

/** Parses `Name <address>`, `"Name" <address>` or a bare address. */
export function parseAddress(value: string): EmailAddress {
  const match = value.match(/^\s*(?:"?((?:[^"\\]|\\.)*?)"?\s*)?<([^<>\s]+@[^<>\s]+)>\s*$/)
  if (match) {
    const name = match[1]?.replace(/\\(.)/g, '$1').trim()
    return { name: name || null, email: match[2]!.toLowerCase() }
  }
  return { name: null, email: value.trim().toLowerCase() }
}

/** Formats a sender or recipient, quoting the display name. */
export function formatAddress(name: string | null | undefined, email: string): string {
  const clean = name?.replace(/[\r\n]+/g, ' ').trim()
  if (!clean) return email
  return `"${clean.replace(/[\\"]/g, '\\$&')}" <${email}>`
}

const SIGNATURE_LENGTH = 16

function replySignature(secret: string, threadId: string): string {
  return createHmac('sha256', secret).update(`reply:${threadId}`).digest('hex').slice(0, SIGNATURE_LENGTH)
}

/**
 * Address a visitor replies to: reply+<thread id>.<signature>@<inbound domain>.
 * The signature stops anyone from posting into a thread by guessing its id.
 */
export function replyAddress(secret: string, threadId: string, domain: string): string {
  const id = threadId.replace(/-/g, '').toLowerCase()
  return `reply+${id}.${replySignature(secret, threadId.toLowerCase())}@${domain}`
}

/** Thread id of a reply address, or null when the address is not one of ours or the signature is wrong. */
export function parseReplyAddress(secret: string, address: string, domain: string): string | null {
  const { email } = parseAddress(address)
  const match = email.match(/^reply\+([0-9a-f]{32})\.([0-9a-f]+)@(.+)$/)
  if (!match || match[3] !== domain.toLowerCase()) return null

  const hex = match[1]!
  const threadId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  const expected = Buffer.from(replySignature(secret, threadId))
  const actual = Buffer.from(match[2]!)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  return threadId
}
