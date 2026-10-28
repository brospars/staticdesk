import { describe, expect, it } from 'vitest'

import { isOriginAllowed } from '../src'

const allowed = ['https://docs.acme.dev', 'https://*.acme.io', 'http://intranet.acme.dev:8080']

describe('isOriginAllowed', () => {
  it('matches exact origins', () => {
    expect(isOriginAllowed('https://docs.acme.dev', allowed)).toBe(true)
    expect(isOriginAllowed('https://evil.dev', allowed)).toBe(false)
    expect(isOriginAllowed('http://docs.acme.dev', allowed)).toBe(false)
  })

  it('matches wildcard subdomains but not the apex', () => {
    expect(isOriginAllowed('https://blog.acme.io', allowed)).toBe(true)
    expect(isOriginAllowed('https://a.b.acme.io', allowed)).toBe(true)
    expect(isOriginAllowed('https://acme.io', allowed)).toBe(false)
    expect(isOriginAllowed('https://evilacme.io', allowed)).toBe(false)
    expect(isOriginAllowed('http://blog.acme.io', allowed)).toBe(false)
  })

  it('respects ports', () => {
    expect(isOriginAllowed('http://intranet.acme.dev:8080', allowed)).toBe(true)
    expect(isOriginAllowed('http://intranet.acme.dev:9090', allowed)).toBe(false)
  })

  it('allows localhost only when enabled', () => {
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(false)
    expect(isOriginAllowed('http://localhost:3000', allowed, { allowLocalhost: true })).toBe(true)
    expect(isOriginAllowed('http://127.0.0.1:4000', allowed, { allowLocalhost: true })).toBe(true)
    expect(isOriginAllowed('https://localhost.evil.dev', allowed, { allowLocalhost: true })).toBe(false)
  })

  it('rejects missing or malformed origins', () => {
    expect(isOriginAllowed(null, allowed)).toBe(false)
    expect(isOriginAllowed('null', allowed)).toBe(false)
    expect(isOriginAllowed('https://docs.acme.dev/path', allowed)).toBe(false)
    expect(isOriginAllowed('javascript:alert(1)', allowed)).toBe(false)
  })
})
