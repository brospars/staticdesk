import { describe, expect, it } from 'vitest'

import {
  commentNeedsApproval,
  commentsWidgetFormSchema,
  parseCommentsWidgetConfig,
  parseReactionsWidgetConfig,
  publicCommentRequestSchema,
  publicReactionRequestSchema,
  reactionsWidgetFormSchema,
} from '../src'

describe('parseCommentsWidgetConfig', () => {
  it('applies defaults', () => {
    expect(parseCommentsWidgetConfig(null)).toEqual({
      title: null,
      allowAnonymous: true,
      moderation: 'anonymous',
      bannedWords: [],
      sort: 'oldest',
    })
  })

  it('keeps the valid banned words only once, lowercased', () => {
    expect(parseCommentsWidgetConfig({ bannedWords: ['Spam', 'spam', '', 42, ' casino '] }).bannedWords).toEqual(['spam', 'casino'])
  })
})

describe('commentNeedsApproval', () => {
  const config = { moderation: 'anonymous' as const, bannedWords: ['casino', 'buy now'] }

  it('follows the moderation mode', () => {
    expect(commentNeedsApproval(config, { anonymous: true, body: 'Hi' })).toBe(true)
    expect(commentNeedsApproval(config, { anonymous: false, body: 'Hi' })).toBe(false)
    expect(commentNeedsApproval({ ...config, moderation: 'all' }, { anonymous: false, body: 'Hi' })).toBe(true)
    expect(commentNeedsApproval({ ...config, moderation: 'none' }, { anonymous: true, body: 'Hi' })).toBe(false)
  })

  it('holds comments with banned words, matching whole words', () => {
    expect(commentNeedsApproval(config, { anonymous: false, body: 'Best CASINO here' })).toBe(true)
    expect(commentNeedsApproval(config, { anonymous: false, body: 'casinos are not banned' })).toBe(false)
    expect(commentNeedsApproval(config, { anonymous: false, body: 'Please buy now!' })).toBe(true)
  })

  it('holds comments with many links', () => {
    const body = 'see https://a.example and https://b.example and www.c.example'
    expect(commentNeedsApproval(config, { anonymous: false, body })).toBe(true)
    expect(commentNeedsApproval(config, { anonymous: false, body: 'see https://a.example' })).toBe(false)
  })
})

describe('parseReactionsWidgetConfig', () => {
  it('drops invalid emojis', () => {
    expect(parseReactionsWidgetConfig({ emojis: ['🎉', 'abc', '👍🏽', '🎉', '<b>'] }).emojis).toEqual(['🎉', '👍🏽'])
  })

  it('defaults to the helpful question', () => {
    expect(parseReactionsWidgetConfig({})).toEqual({ title: null, helpful: true, askComment: true, emojis: [] })
  })
})

describe('reactionsWidgetFormSchema', () => {
  it('needs something to show', () => {
    const result = reactionsWidgetFormSchema.safeParse({ name: 'Feedback', title: '', helpful: false, askComment: false, emojis: [] })
    expect(result.success).toBe(false)
  })

  it('rejects duplicate emojis', () => {
    const result = reactionsWidgetFormSchema.safeParse({ name: 'Feedback', title: '', helpful: true, askComment: true, emojis: ['🎉', '🎉'] })
    expect(result.success).toBe(false)
  })
})

describe('commentsWidgetFormSchema', () => {
  it('stores an empty title as null', () => {
    const result = commentsWidgetFormSchema.parse({ name: 'Comments', title: ' ', allowAnonymous: true, moderation: 'all', bannedWords: [], sort: 'newest' })
    expect(result.title).toBeNull()
  })
})

describe('public requests', () => {
  it('accepts helpful and emoji reactions only', () => {
    const base = { pageId: '/docs' }
    expect(publicReactionRequestSchema.safeParse({ ...base, kind: 'helpful' }).success).toBe(true)
    expect(publicReactionRequestSchema.safeParse({ ...base, kind: 'emoji:🎉' }).success).toBe(true)
    expect(publicReactionRequestSchema.safeParse({ ...base, kind: 'emoji:nope' }).success).toBe(false)
    expect(publicReactionRequestSchema.safeParse({ ...base, kind: 'like' }).success).toBe(false)
  })

  it('validates comments', () => {
    const comment = { pageId: '/docs', body: '  Nice page ', elapsedMs: 5000 }
    expect(publicCommentRequestSchema.parse(comment).body).toBe('Nice page')
    expect(publicCommentRequestSchema.safeParse({ ...comment, body: '   ' }).success).toBe(false)
    expect(publicCommentRequestSchema.safeParse({ ...comment, parentId: 'nope' }).success).toBe(false)
  })
})
