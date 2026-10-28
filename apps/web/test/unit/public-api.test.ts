import { describe, expect, it, vi } from 'vitest'
import { parseSiteSettings } from '@staticdesk/core'

import { corsDecision } from '../../server/utils/public/cors'
import { computeFingerprint } from '../../server/utils/public/fingerprint'
import type { PublicSite } from '../../server/utils/public/site'
import { isLikelyBot } from '../../server/utils/public/spam'
import { verifyTurnstile } from '../../server/utils/public/turnstile'

const site: PublicSite = {
  id: 'site-1',
  workspaceId: 'ws-1',
  name: 'Docs',
  allowedOrigins: ['https://docs.acme.dev'],
  settings: parseSiteSettings({ allowLocalhost: false }),
  widgets: [],
}

describe('corsDecision', () => {
  it('allows declared origins and echoes them', () => {
    const decision = corsDecision('POST', 'https://docs.acme.dev', site)
    expect(decision.allowed).toBe(true)
    expect(decision.allowed && decision.headers['Access-Control-Allow-Origin']).toBe('https://docs.acme.dev')
  })

  it('rejects other origins', () => {
    expect(corsDecision('POST', 'https://evil.dev', site).allowed).toBe(false)
    expect(corsDecision('GET', 'https://evil.dev', site).allowed).toBe(false)
  })

  it('allows reads without an Origin header but not writes', () => {
    expect(corsDecision('GET', undefined, site)).toEqual({ allowed: true, headers: {} })
    expect(corsDecision('POST', undefined, site).allowed).toBe(false)
  })
})

describe('computeFingerprint', () => {
  const parts = { siteId: 'site-1', ip: '203.0.113.7', userAgent: 'Firefox', day: '2026-10-28' }

  it('is stable for the same visitor, site and day', () => {
    expect(computeFingerprint('secret', parts)).toBe(computeFingerprint('secret', parts))
  })

  it('changes across sites, days and secrets, and hides the IP', () => {
    const base = computeFingerprint('secret', parts)
    expect(computeFingerprint('secret', { ...parts, siteId: 'site-2' })).not.toBe(base)
    expect(computeFingerprint('secret', { ...parts, day: '2026-10-29' })).not.toBe(base)
    expect(computeFingerprint('other', parts)).not.toBe(base)
    expect(base).not.toContain('203.0.113.7')
  })
})

describe('isLikelyBot', () => {
  it('flags filled honeypots and instant submissions', () => {
    expect(isLikelyBot({ website: 'http://spam.example', elapsedMs: 10_000 })).toBe(true)
    expect(isLikelyBot({ elapsedMs: 300 })).toBe(true)
    expect(isLikelyBot({ website: '', elapsedMs: 8_000 })).toBe(false)
  })
})

describe('verifyTurnstile', () => {
  it('returns the verification result', async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })))
    expect(await verifyTurnstile('token', 'secret', '203.0.113.7', ok)).toBe(true)
    const body = ok.mock.calls[0]![1].body as URLSearchParams
    expect(body.get('response')).toBe('token')
    expect(body.get('remoteip')).toBe('203.0.113.7')

    const ko = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false })))
    expect(await verifyTurnstile('token', 'secret', undefined, ko)).toBe(false)
  })

  it('fails closed on missing tokens and network errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await verifyTurnstile(undefined, 'secret')).toBe(false)
    expect(await verifyTurnstile('token', 'secret', undefined, fetcher)).toBe(false)
  })
})
