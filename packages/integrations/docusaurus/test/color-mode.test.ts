import { beforeEach, describe, expect, it } from 'vitest'

import { syncColorMode } from '../src/client/color-mode.js'

beforeEach(() => {
  document.body.innerHTML = ''
  document.documentElement.dataset.theme = 'light'
})

describe('syncColorMode', () => {
  it('copies the Docusaurus color mode to the widgets', () => {
    document.body.innerHTML = '<staticdesk-contact mode="floating"></staticdesk-contact>'
    const element = document.querySelector('staticdesk-contact')!
    syncColorMode()
    expect(element.getAttribute('theme')).toBe('light')

    document.documentElement.dataset.theme = 'dark'
    syncColorMode()
    expect(element.getAttribute('theme')).toBe('dark')
  })

  it('keeps a theme chosen by the author', () => {
    document.body.innerHTML = '<staticdesk-contact theme="light"></staticdesk-contact>'
    document.documentElement.dataset.theme = 'dark'
    syncColorMode()
    syncColorMode()
    expect(document.querySelector('staticdesk-contact')!.getAttribute('theme')).toBe('light')
  })
})
