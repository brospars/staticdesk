export interface StaticDeskConfig {
  siteKey: string
  apiBase: string
  /** Language forced by the embed snippet (data-locale). */
  locale: string | null
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

  return { siteKey, apiBase: apiBase.replace(/\/$/, ''), locale: script.dataset.locale ?? null }
}
