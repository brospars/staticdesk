import { describe, expect, it } from 'vitest'
import { parseSiteSettings } from '@staticdesk/core'

import { isReactionAllowed, resolveCommentsWidget, toPublicComment } from '../../server/utils/community/widgets'
import { corsDecision } from '../../server/utils/public/cors'
import type { PublicSite } from '../../server/utils/public/site'
import { generateToken, hashToken, tokenMatches } from '../../server/utils/tokens'

const site: PublicSite = {
  id: 'site-1',
  workspaceId: 'ws-1',
  name: 'Docs',
  allowedOrigins: ['https://docs.acme.dev'],
  settings: parseSiteSettings({}),
  widgets: [
    { id: 'w-comments', kind: 'comments', name: 'Comments', config: { moderation: 'all' } },
    { id: 'w-helpful', kind: 'reactions', name: 'Helpful', config: { helpful: true } },
    { id: 'w-emoji', kind: 'reactions', name: 'Emoji', config: { helpful: false, emojis: ['🎉'] } },
  ],
}

describe('resolveCommentsWidget', () => {
  it('uses the requested widget, else the first comments widget', () => {
    expect(resolveCommentsWidget(site, 'w-comments')?.config.moderation).toBe('all')
    expect(resolveCommentsWidget(site, 'unknown')?.id).toBe('w-comments')
    expect(resolveCommentsWidget({ ...site, widgets: [] })).toBeNull()
  })
})

describe('isReactionAllowed', () => {
  it('only accepts the kinds offered by an enabled reactions widget', () => {
    expect(isReactionAllowed(site, 'helpful')).toBe(true)
    expect(isReactionAllowed(site, 'emoji:🎉')).toBe(true)
    expect(isReactionAllowed(site, 'emoji:🚀')).toBe(false)
  })

  it('checks the requested widget when given', () => {
    expect(isReactionAllowed(site, 'unhelpful', 'w-emoji')).toBe(false)
    expect(isReactionAllowed(site, 'emoji:🎉', 'w-helpful')).toBe(false)
  })
})

describe('toPublicComment', () => {
  const row = {
    id: 'c-1',
    parent_id: null,
    is_anonymous: true,
    author_name: null,
    body: 'Hi',
    deleted_at: null,
    created_at: '2026-10-28T10:00:00Z',
    edited_at: null,
  }

  it('keeps the public fields only', () => {
    expect(toPublicComment(row)).toEqual({
      id: 'c-1', parentId: null, author: null, body: 'Hi', deleted: false, createdAt: row.created_at, editedAt: null, replies: [],
    })
    expect(toPublicComment({ ...row, is_anonymous: false, author_name: 'Ada', deleted_at: row.created_at }).deleted).toBe(true)
  })
})

describe('tokenMatches', () => {
  it('compares a token with its hash', () => {
    const token = generateToken()
    expect(tokenMatches(token, hashToken(token))).toBe(true)
    expect(tokenMatches(generateToken(), hashToken(token))).toBe(false)
    expect(tokenMatches(token, null)).toBe(false)
    expect(tokenMatches('abc', 'abc', false)).toBe(true)
    expect(tokenMatches('abc', 'abcd', false)).toBe(false)
  })
})

describe('corsDecision', () => {
  it('allows editing and deleting from the site', () => {
    const decision = corsDecision('OPTIONS', 'https://docs.acme.dev', site)
    expect(decision.allowed && decision.headers['Access-Control-Allow-Methods']).toContain('DELETE')
  })
})
