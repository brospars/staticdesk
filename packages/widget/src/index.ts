export interface StaticDeskConfig {
  siteKey: string
  apiBase: string
}

/** Reads the configuration from the `<script data-site="…">` tag that loaded the widget. */
export function readConfig(script: HTMLScriptElement | null): StaticDeskConfig | null {
  const siteKey = script?.dataset.site
  if (!script || !siteKey) return null

  let apiBase = script.dataset.apiBase
  if (!apiBase) {
    try {
      apiBase = new URL(script.src, window.location.href).origin
    }
    catch {
      apiBase = window.location.origin
    }
  }

  return { siteKey, apiBase: apiBase.replace(/\/$/, '') }
}

const config = readConfig(document.currentScript as HTMLScriptElement | null)

if (!config) {
  console.error('[StaticDesk] Missing data-site attribute on the widget script tag.')
}

export { config }
