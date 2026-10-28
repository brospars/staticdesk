import { describe, expect, it } from 'vitest'

import {
  fillTemplate,
  inboxFiltersSchema,
  sendingDomainSchema,
  threadLabelsSchema,
  threadReplySchema,
} from '../src'

describe('threadReplySchema', () => {
  it('trims the body and rejects empty replies', () => {
    expect(threadReplySchema.parse({ body: '  Hello  ' })).toEqual({ body: 'Hello' })
    expect(threadReplySchema.safeParse({ body: '   ' }).success).toBe(false)
  })

  it('accepts a status change', () => {
    expect(threadReplySchema.parse({ body: 'Done', status: 'resolved' }).status).toBe('resolved')
    expect(threadReplySchema.safeParse({ body: 'Done', status: 'closed' }).success).toBe(false)
  })
})

describe('threadLabelsSchema', () => {
  it('normalizes and deduplicates labels', () => {
    expect(threadLabelsSchema.parse([' Bug ', 'bug', 'Docs'])).toEqual(['bug', 'docs'])
  })

  it('rejects commas and long labels', () => {
    expect(threadLabelsSchema.safeParse(['a,b']).success).toBe(false)
    expect(threadLabelsSchema.safeParse(['x'.repeat(41)]).success).toBe(false)
  })
})

describe('inboxFiltersSchema', () => {
  it('defaults to open threads', () => {
    expect(inboxFiltersSchema.parse({})).toEqual({ status: 'open' })
  })

  it('drops invalid values instead of failing', () => {
    expect(inboxFiltersSchema.parse({ status: 'nope', site: 'x', assignee: 'someone', q: '' })).toEqual({ status: 'open' })
  })

  it('keeps valid filters', () => {
    const site = '33333333-3333-3333-3333-333333333333'
    expect(inboxFiltersSchema.parse({ status: 'all', site, assignee: 'me', label: 'bug', q: 'postgres' }))
      .toEqual({ status: 'all', site, assignee: 'me', label: 'bug', q: 'postgres' })
  })
})

describe('sendingDomainSchema', () => {
  it('accepts domains and subdomains', () => {
    expect(sendingDomainSchema.parse({ domain: ' Mail.Example.com ' })).toEqual({ domain: 'mail.example.com', fromLocalPart: 'support' })
  })

  it('rejects URLs and bare names', () => {
    for (const domain of ['https://example.com', 'example', 'exa mple.com', '-bad.com']) {
      expect(sendingDomainSchema.safeParse({ domain }).success).toBe(false)
    }
  })
})

describe('fillTemplate', () => {
  it('replaces known variables', () => {
    expect(fillTemplate('Hi {{name}}, thanks for writing to {{ site }}.', { name: 'Ada', site: 'Docs' }))
      .toBe('Hi Ada, thanks for writing to Docs.')
  })

  it('uses the fallback for empty values', () => {
    expect(fillTemplate('Hi {{name|there}}!', { name: null })).toBe('Hi there!')
    expect(fillTemplate('Hi {{name}}!', { name: '' })).toBe('Hi !')
  })

  it('leaves unknown variables untouched', () => {
    expect(fillTemplate('{{unknown}} {{toString}}', {})).toBe('{{unknown}} {{toString}}')
  })
})
