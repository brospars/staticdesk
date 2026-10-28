/** Options of the plugin, as written in docusaurus.config.js. */
export interface PluginOptions {
  /** Public key of the site in StaticDesk (pk_…). */
  siteKey: string
  /** URL of widget.js. Use your own server when self-hosting. */
  scriptUrl?: string
  /** StaticDesk server, when widget.js is loaded from a CDN. Defaults to the script's origin. */
  apiBase?: string
  /** Force the widget language ('en', 'fr'). Defaults to the site setting, then the browser language. */
  locale?: string
  /** Show the floating contact button on every page. */
  contactButton?: boolean
  /** Contact widget used by the floating button, when the site has several. */
  widgetId?: string
  /** Follow the Docusaurus light and dark modes. */
  syncColorMode?: boolean
}

export type NormalizedOptions = Required<Pick<PluginOptions, 'siteKey' | 'scriptUrl' | 'contactButton' | 'syncColorMode'>>
  & Pick<PluginOptions, 'apiBase' | 'locale' | 'widgetId'>

export const DEFAULT_SCRIPT_URL = 'https://staticdesk.app/widget.js'

const SITE_KEY = /^pk_[a-z0-9]{8,64}$/
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isHttpUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  }
  catch {
    return false
  }
}

/** Checks the options and applies the defaults. Throws with every problem found. */
export function normalizeOptions(input: unknown): NormalizedOptions {
  const options = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  const errors: string[] = []
  const optionalString = (name: string, valid: (value: string) => boolean, hint: string) => {
    const value = options[name]
    if (value === undefined) return undefined
    if (typeof value !== 'string' || !valid(value)) {
      errors.push(`"${name}" ${hint}`)
      return undefined
    }
    return value
  }
  const optionalBoolean = (name: string, fallback: boolean) => {
    const value = options[name]
    if (value === undefined) return fallback
    if (typeof value !== 'boolean') errors.push(`"${name}" must be true or false`)
    return value === true
  }

  const siteKey = options.siteKey
  if (typeof siteKey !== 'string' || !SITE_KEY.test(siteKey)) {
    errors.push('"siteKey" must be your site\'s public key (pk_…), from the StaticDesk dashboard')
  }
  const normalized: NormalizedOptions = {
    siteKey: siteKey as string,
    scriptUrl: optionalString('scriptUrl', isHttpUrl, 'must be an http(s) URL') ?? DEFAULT_SCRIPT_URL,
    apiBase: optionalString('apiBase', isHttpUrl, 'must be an http(s) URL'),
    locale: optionalString('locale', value => /^[a-z]{2}$/.test(value), 'must be a language code such as "en" or "fr"'),
    contactButton: optionalBoolean('contactButton', true),
    widgetId: optionalString('widgetId', value => GUID.test(value), 'must be a widget id from the StaticDesk dashboard'),
    syncColorMode: optionalBoolean('syncColorMode', true),
  }

  if (errors.length) throw new Error(`Invalid @staticdesk/docusaurus-plugin options:\n- ${errors.join('\n- ')}`)
  return normalized
}
