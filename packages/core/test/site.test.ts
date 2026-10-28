import { describe, expect, it } from 'vitest'

import { buildEmbedSnippet, siteSchema } from '../src'

describe('siteSchema', () => {
  it('normalizes the URL to its origin', () => {
    const site = siteSchema.parse({ name: 'Docs', origin: 'https://docs.acme.dev/guide/intro?x=1' })
    expect(site.origin).toBe('https://docs.acme.dev')
  })

  it('keeps non-default ports', () => {
    expect(siteSchema.parse({ name: 'Local', origin: 'http://localhost:4000/' }).origin).toBe('http://localhost:4000')
  })

  it('rejects non-http URLs', () => {
    expect(siteSchema.safeParse({ name: 'Docs', origin: 'ftp://acme.dev' }).success).toBe(false)
    expect(siteSchema.safeParse({ name: 'Docs', origin: 'acme.dev' }).success).toBe(false)
  })
})

describe('buildEmbedSnippet', () => {
  it('renders the loader and the widget element', () => {
    expect(buildEmbedSnippet({
      scriptUrl: 'https://staticdesk.app/widget.js',
      siteKey: 'pk_123',
      kind: 'comments',
    })).toBe(
      '<script src="https://staticdesk.app/widget.js" data-site="pk_123" defer></script>\n'
      + '<staticdesk-comments></staticdesk-comments>',
    )
  })

  it('escapes attribute values', () => {
    const snippet = buildEmbedSnippet({ scriptUrl: 'https://x.dev/w.js?a=1&b="2"', siteKey: 'pk', kind: 'contact' })
    expect(snippet).toContain('src="https://x.dev/w.js?a=1&amp;b=&quot;2&quot;"')
  })
})
