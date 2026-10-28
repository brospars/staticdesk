import type { Locale, PublicSiteConfig } from '@staticdesk/core'

import { resolveLocale, translator, type Translate } from '../i18n'
import { currentPage, onNavigate, type PageInfo } from '../page'
import { getRuntime, type Runtime } from '../runtime'
import { baseStyles, themeStyles } from '../styles'

/**
 * Base class of the StaticDesk custom elements: a shadow root with the shared
 * styles, the site configuration, the theme and a translator.
 *
 * Attributes: `locale` ("en", "fr"), `theme` ("auto", "light", "dark") and,
 * for the elements tied to a page, `page-id`.
 */
export abstract class StaticDeskElement extends HTMLElement {
  protected readonly root: ShadowRoot
  protected runtime: Runtime | null = null
  protected site: PublicSiteConfig | null = null
  protected locale: Locale = 'en'
  protected t: Translate = translator('en')
  private loaded = false
  private unlisten: (() => void) | null = null

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
  }

  async connectedCallback() {
    if (this.onPageChange && !this.unlisten) {
      this.unlisten = onNavigate(() => {
        if (this.site) this.onPageChange!()
      })
    }
    if (this.loaded) return
    this.loaded = true

    this.runtime = getRuntime()
    if (!this.runtime) {
      console.error(`[StaticDesk] <${this.localName}> needs the widget script with a data-site attribute.`)
      return
    }

    try {
      this.site = await this.runtime.api.config()
    }
    catch (error) {
      console.error('[StaticDesk] Could not load the site configuration.', error)
      return
    }

    this.locale = resolveLocale([this.getAttribute('locale'), this.runtime.config.locale, this.site.locale])
    this.t = translator(this.locale)
    this.applyTheme()

    const style = document.createElement('style')
    style.textContent = baseStyles + themeStyles(this.site.theme.primaryColor) + this.styles()
    this.root.replaceChildren(style)
    this.render()
  }

  disconnectedCallback() {
    this.unlisten?.()
    this.unlisten = null
  }

  /** Page the element is about: the `page-id` attribute, else the page's canonical path. */
  protected page(): PageInfo {
    const page = currentPage()
    const pageId = this.getAttribute('page-id')
    return pageId ? { ...page, pageId } : page
  }

  static get observedAttributes() {
    return ['theme']
  }

  /** The `theme` attribute can change at any time, e.g. with the page's dark mode toggle. */
  attributeChangedCallback() {
    if (this.site) this.applyTheme()
  }

  private applyTheme() {
    const mode = this.getAttribute('theme') ?? this.site!.theme.mode
    if (mode === 'light' || mode === 'dark') this.dataset.mode = mode
    else delete this.dataset.mode
  }

  /** Component-specific CSS. */
  protected abstract styles(): string
  /** Builds the shadow DOM once the configuration is loaded. */
  protected abstract render(): void
  /** Called when a single-page app navigates to another page. */
  protected onPageChange?(): void
}
