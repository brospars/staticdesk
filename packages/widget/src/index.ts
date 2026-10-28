import { createApi } from './api'
import { readConfig } from './config'
import { StaticDeskComments } from './elements/comments'
import { StaticDeskContact } from './elements/contact'
import { StaticDeskReactions } from './elements/reactions'
import { currentPage, onNavigate } from './page'
import { getRuntime, setRuntime } from './runtime'

declare const __VERSION__: string

export interface StaticDeskGlobal {
  version: string
  /** Opens the first floating contact form of the page. */
  openContact(): void
}

declare global {
  interface Window {
    StaticDesk?: StaticDeskGlobal
  }
}

function boot() {
  // The script may be included twice (theme + page): only the first one runs.
  if (getRuntime() || window.StaticDesk) return

  const config = readConfig(document.currentScript as HTMLScriptElement | null)
  if (!config) {
    console.error('[StaticDesk] Missing data-site attribute on the widget script tag.')
    return
  }

  const api = createApi(config)
  setRuntime({ config, api })

  window.StaticDesk = {
    version: __VERSION__,
    openContact: () => document.querySelector<StaticDeskContact>('staticdesk-contact[mode="floating"]')?.open(),
  }

  const elements: [string, CustomElementConstructor][] = [
    ['staticdesk-contact', StaticDeskContact],
    ['staticdesk-comments', StaticDeskComments],
    ['staticdesk-reactions', StaticDeskReactions],
  ]
  for (const [name, element] of elements) {
    if (!customElements.get(name)) customElements.define(name, element)
  }

  // One page view per page load and per single-page-app navigation.
  const trackView = () => api.track({ type: 'view', ...currentPage() })
  trackView()
  onNavigate(trackView)
}

boot()
