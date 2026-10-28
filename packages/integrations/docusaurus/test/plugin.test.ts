// @vitest-environment node
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import staticDeskPlugin, { DEFAULT_SCRIPT_URL, validateOptions } from '../src/index.js'

const siteKey = 'pk_demo000000000000000000'

describe('staticDeskPlugin', () => {
  it('loads the widget and adds the floating button', () => {
    const { headTags, postBodyTags } = staticDeskPlugin({}, { siteKey }).injectHtmlTags()
    expect(headTags).toEqual([{
      tagName: 'script',
      attributes: { 'src': DEFAULT_SCRIPT_URL, 'data-site': siteKey, 'defer': true },
    }])
    expect(postBodyTags).toEqual([{ tagName: 'staticdesk-contact', customElement: true, attributes: { mode: 'floating' } }])
  })

  it('passes the server, language and widget options to the widget', () => {
    const plugin = staticDeskPlugin({}, {
      siteKey,
      scriptUrl: 'https://cdn.jsdelivr.net/npm/@staticdesk/widget@0.1/dist/widget.js',
      apiBase: 'https://desk.example.com',
      locale: 'fr',
      widgetId: '44444444-4444-4444-4444-444444444444',
    })
    const { headTags, postBodyTags } = plugin.injectHtmlTags()
    expect(headTags[0]!.attributes).toMatchObject({
      'src': 'https://cdn.jsdelivr.net/npm/@staticdesk/widget@0.1/dist/widget.js',
      'data-api-base': 'https://desk.example.com',
      'data-locale': 'fr',
    })
    expect(postBodyTags[0]!.attributes).toEqual({ 'mode': 'floating', 'widget-id': '44444444-4444-4444-4444-444444444444' })
  })

  it('can leave out the floating button and the color mode sync', () => {
    const plugin = staticDeskPlugin({}, { siteKey, contactButton: false, syncColorMode: false })
    expect(plugin.injectHtmlTags().postBodyTags).toEqual([])
    expect(plugin.getClientModules()).toEqual([])
  })

  it('points to its theme components and client module', () => {
    const plugin = staticDeskPlugin({}, { siteKey })
    expect(plugin.getThemePath()).toMatch(/[/\\]theme$/)
    expect(plugin.getClientModules()[0]).toMatch(/client[/\\]color-mode\.js$/)
    expect(existsSync(plugin.getThemePath())).toBe(true)
  })
})

describe('validateOptions', () => {
  it('applies the defaults', () => {
    expect(validateOptions({ options: { siteKey } })).toEqual({
      siteKey,
      scriptUrl: DEFAULT_SCRIPT_URL,
      apiBase: undefined,
      locale: undefined,
      contactButton: true,
      widgetId: undefined,
      syncColorMode: true,
    })
  })

  it('reports every invalid option', () => {
    expect(() => validateOptions({ options: { siteKey: 'sk_secret', scriptUrl: 'javascript:alert(1)', contactButton: 'yes' } }))
      .toThrow(/"siteKey"[\s\S]*"scriptUrl"[\s\S]*"contactButton"/)
    expect(() => validateOptions({ options: undefined })).toThrow(/siteKey/)
  })
})
