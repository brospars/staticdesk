import { describe, expect, it } from 'vitest'

import { safeRedirectPath } from '../../app/utils/redirect'

describe('safeRedirectPath', () => {
  it('keeps same-origin paths', () => {
    expect(safeRedirectPath('/app/inbox?status=open')).toBe('/app/inbox?status=open')
  })

  it('falls back for empty values', () => {
    expect(safeRedirectPath(null)).toBe('/app')
    expect(safeRedirectPath('')).toBe('/app')
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/app')
    expect(safeRedirectPath('//evil.example')).toBe('/app')
    expect(safeRedirectPath('/\\evil.example')).toBe('/app')
  })
})
