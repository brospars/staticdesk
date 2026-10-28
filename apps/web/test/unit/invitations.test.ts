import { describe, expect, it } from 'vitest'

import { invitationEmail } from '../../server/emails/invitation'
import { generateToken, hashToken } from '../../server/utils/tokens'

describe('tokens', () => {
  it('generates distinct URL-safe tokens', () => {
    const a = generateToken()
    expect(a).toMatch(/^[\w-]{43}$/)
    expect(generateToken()).not.toBe(a)
  })

  it('hashes deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken('abc')).not.toBe(hashToken('abd'))
  })
})

describe('invitationEmail', () => {
  it('escapes user-provided values in the HTML body', () => {
    const email = invitationEmail({
      to: 'new@example.com',
      workspaceName: '<script>alert(1)</script>',
      inviterEmail: 'owner@example.com',
      acceptUrl: 'https://staticdesk.app/invite/tok',
    })
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.text).toContain('https://staticdesk.app/invite/tok')
  })
})
