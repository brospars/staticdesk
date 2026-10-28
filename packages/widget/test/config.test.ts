import { describe, expect, it } from 'vitest'

import { readConfig } from '../src'

function scriptTag(attrs: Record<string, string>) {
  const script = document.createElement('script')
  for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value)
  return script
}

describe('readConfig', () => {
  it('returns null without a site key', () => {
    expect(readConfig(scriptTag({ src: 'https://staticdesk.app/widget.js' }))).toBeNull()
    expect(readConfig(null)).toBeNull()
  })

  it('derives the API base from the script origin', () => {
    const script = scriptTag({ 'src': 'https://staticdesk.app/widget.js', 'data-site': 'pk_123' })
    expect(readConfig(script)).toEqual({ siteKey: 'pk_123', apiBase: 'https://staticdesk.app' })
  })

  it('prefers an explicit data-api-base', () => {
    const script = scriptTag({
      'src': 'https://cdn.example.com/widget.js',
      'data-site': 'pk_123',
      'data-api-base': 'https://desk.example.com/',
    })
    expect(readConfig(script)).toEqual({ siteKey: 'pk_123', apiBase: 'https://desk.example.com' })
  })
})
