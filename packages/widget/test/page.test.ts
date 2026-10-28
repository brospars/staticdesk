import { afterEach, describe, expect, it, vi } from 'vitest'

import { currentPage, normalizePath, onNavigate } from '../src/page'

afterEach(() => {
  document.head.innerHTML = ''
  history.replaceState(null, '', '/')
})

describe('normalizePath', () => {
  it('strips index files and trailing slashes', () => {
    expect(normalizePath('/docs/')).toBe('/docs')
    expect(normalizePath('/docs/index.html')).toBe('/docs')
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('/index.html')).toBe('/')
  })
})

describe('currentPage', () => {
  it('uses the canonical URL when present', () => {
    history.replaceState(null, '', '/fr/guide/?utm=x#top')
    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = 'https://docs.acme.dev/guide/'
    document.head.append(link)
    expect(currentPage()).toEqual({ pageId: '/guide', pageUrl: `${location.origin}/fr/guide/?utm=x` })
  })

  it('falls back to the location path', () => {
    history.replaceState(null, '', '/blog/post/')
    expect(currentPage().pageId).toBe('/blog/post')
  })
})

describe('onNavigate', () => {
  it('fires on path changes from the history API', () => {
    const listener = vi.fn()
    const stop = onNavigate(listener)
    history.pushState(null, '', '/a')
    history.pushState(null, '', '/a?tab=2')
    history.replaceState(null, '', '/b')
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
    history.pushState(null, '', '/c')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
