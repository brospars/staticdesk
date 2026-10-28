import { describe, expect, it } from 'vitest'

import { parseContactWidgetConfig, parseSiteSettings, publicContactRequestSchema, publicEventSchema } from '../src'

describe('parseSiteSettings', () => {
  it('applies defaults to an empty object', () => {
    expect(parseSiteSettings({})).toEqual({
      locale: null,
      theme: { primaryColor: null, mode: 'auto' },
      allowLocalhost: true,
      turnstile: false,
    })
  })

  it('keeps valid values and drops invalid ones', () => {
    const settings = parseSiteSettings({ locale: 'fr', theme: { primaryColor: 'red', mode: 'dark' }, turnstile: true })
    expect(settings.locale).toBe('fr')
    expect(settings.theme).toEqual({ primaryColor: null, mode: 'dark' })
    expect(settings.turnstile).toBe(true)
  })

  it('tolerates non-object input', () => {
    expect(parseSiteSettings(null).theme.mode).toBe('auto')
  })
})

describe('parseContactWidgetConfig', () => {
  it('nulls out invalid texts', () => {
    expect(parseContactWidgetConfig({ title: '  ', position: 'top' })).toMatchObject({ title: null, position: 'bottom-right' })
  })
})

describe('public schemas', () => {
  it('rejects client-sent submit events', () => {
    expect(publicEventSchema.safeParse({ type: 'submit', pageId: '/' }).success).toBe(false)
    expect(publicEventSchema.safeParse({ type: 'view', pageId: '/' }).success).toBe(true)
  })

  it('validates contact requests', () => {
    const base = { email: 'ada@example.com', message: 'Hi', pageId: '/contact', elapsedMs: 5000 }
    expect(publicContactRequestSchema.safeParse(base).success).toBe(true)
    expect(publicContactRequestSchema.safeParse({ ...base, elapsedMs: -1 }).success).toBe(false)
    expect(publicContactRequestSchema.safeParse({ ...base, widgetId: 'nope' }).success).toBe(false)
  })
})

describe('ids', () => {
  it('accepts any Postgres uuid, including non-RFC 4122 ones used in seeds', () => {
    const base = { email: 'ada@example.com', message: 'Hi', pageId: '/', elapsedMs: 5000 }
    expect(publicContactRequestSchema.safeParse({ ...base, widgetId: '44444444-4444-4444-4444-000000000001' }).success).toBe(true)
  })
})
