import { describe, expect, it, vi } from 'vitest'

import { invitationEmail } from '../../server/emails/invitation'
import { ensureAccount } from '../../server/utils/accounts'
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

describe('ensureAccount', () => {
  it('creates a confirmed account or accepts an existing one', async () => {
    const createUser = vi.fn()
      .mockResolvedValueOnce({ data: { user: {} }, error: null })
      .mockResolvedValueOnce({ data: { user: null }, error: { code: 'email_exists', message: 'exists' } })
    const admin = { createUser } as unknown as Parameters<typeof ensureAccount>[0]
    expect(await ensureAccount(admin, 'bob@example.com')).toBe('created')
    expect(createUser).toHaveBeenCalledWith({ email: 'bob@example.com', email_confirm: true })
    expect(await ensureAccount(admin, 'bob@example.com')).toBe('exists')
  })

  it('fails on other errors', async () => {
    const createUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { code: 'unexpected_failure', message: 'down' } })
    await expect(ensureAccount({ createUser } as unknown as Parameters<typeof ensureAccount>[0], 'a@b.dev')).rejects.toMatchObject({ message: 'down' })
  })
})
