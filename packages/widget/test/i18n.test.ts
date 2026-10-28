import { describe, expect, it } from 'vitest'

import { resolveLocale, translator } from '../src/i18n'
import { contrastColor, themeStyles } from '../src/styles'

describe('resolveLocale', () => {
  it('prefers explicit choices, then the browser languages', () => {
    expect(resolveLocale(['fr', 'en'], ['en-US'])).toBe('fr')
    expect(resolveLocale([null, undefined], ['fr-CA', 'en'])).toBe('fr')
    expect(resolveLocale([null], ['de-DE', 'en-GB'])).toBe('en')
  })

  it('falls back to English', () => {
    expect(resolveLocale(['xx'], ['de'])).toBe('en')
  })
})

describe('translator', () => {
  it('translates keys', () => {
    expect(translator('fr')('contact.submit')).toBe('Envoyer le message')
    expect(translator('en')('contact.submit')).toBe('Send message')
  })
})

describe('theme', () => {
  it('picks a readable text color', () => {
    expect(contrastColor('#ffffff')).toBe('#000000')
    expect(contrastColor('#4f46e5')).toBe('#ffffff')
    expect(contrastColor('#facc15')).toBe('#000000')
  })

  it('ignores invalid colors', () => {
    expect(themeStyles('red; } * { display: none')).toBe('')
    expect(themeStyles('#e11d48')).toContain('--sd-primary: #e11d48')
  })
})
