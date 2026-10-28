interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string
  reset(widgetId: string): void
  getResponse(widgetId: string): string | undefined
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export interface TurnstileHandle {
  token(): string | null
  reset(): void
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | undefined

function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable'))
    script.onerror = () => reject(new Error('Could not load Turnstile'))
    document.head.append(script)
  })
  return loading
}

/**
 * Renders a Turnstile challenge for `host`. Turnstile does not work inside a
 * shadow root, so the container lives in the light DOM and is projected through
 * the element's `turnstile` slot.
 */
export async function renderTurnstile(host: HTMLElement, siteKey: string, language: string): Promise<TurnstileHandle> {
  const turnstile = await loadTurnstile()
  const container = document.createElement('div')
  container.slot = 'turnstile'
  container.style.margin = '0 0 14px'
  host.append(container)
  const id = turnstile.render(container, { sitekey: siteKey, language, theme: 'auto' })
  return {
    token: () => turnstile.getResponse(id) || null,
    reset: () => turnstile.reset(id),
  }
}
