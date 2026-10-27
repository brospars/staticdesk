import { describe, expect, it } from 'vitest'

import { SLUG_PATTERN, slugify, workspaceSchema } from '../src'

describe('slugify', () => {
  it('normalizes names', () => {
    expect(slugify('Ada\'s Docs!')).toBe('adas-docs')
    expect(slugify('  Équipe Données  ')).toBe('equipe-donnees')
    expect(slugify('a---b')).toBe('a-b')
  })

  it('produces slugs accepted by the database rule', () => {
    for (const name of ['My Company', 'x', 'A'.repeat(100), 'Docs 2026 — v2']) {
      expect(slugify(name)).toMatch(SLUG_PATTERN)
    }
  })

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('workspaceSchema', () => {
  it('rejects invalid slugs', () => {
    expect(workspaceSchema.safeParse({ name: 'Acme', slug: '-acme' }).success).toBe(false)
    expect(workspaceSchema.safeParse({ name: 'Acme', slug: 'Acme' }).success).toBe(false)
    expect(workspaceSchema.safeParse({ name: 'Acme', slug: 'acme' }).success).toBe(true)
  })
})
