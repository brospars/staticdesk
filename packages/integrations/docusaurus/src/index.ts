import { fileURLToPath } from 'node:url'

import { normalizeOptions, type NormalizedOptions, type PluginOptions } from './options.js'

export { DEFAULT_SCRIPT_URL, normalizeOptions, type PluginOptions } from './options.js'

/** The parts of the Docusaurus plugin API this plugin uses (see @docusaurus/types). */
interface HtmlTag {
  tagName: string
  attributes?: Record<string, string | boolean>
  innerHTML?: string
  /** Required by Docusaurus for tag names that are not standard HTML. */
  customElement?: boolean
}

export interface StaticDeskPlugin {
  name: string
  injectHtmlTags(): { headTags: HtmlTag[], postBodyTags: HtmlTag[] }
  getThemePath(): string
  getClientModules(): string[]
}

/**
 * Docusaurus plugin: loads the StaticDesk widget on every page, adds the
 * floating contact button, and provides the @theme/StaticDeskContact component.
 *
 * plugins: [['@staticdesk/docusaurus-plugin', { siteKey: 'pk_…' }]]
 */
export default function staticDeskPlugin(_context: unknown, input: PluginOptions): StaticDeskPlugin {
  const options: NormalizedOptions = normalizeOptions(input)

  const script: HtmlTag = {
    tagName: 'script',
    attributes: {
      'src': options.scriptUrl,
      'data-site': options.siteKey,
      ...(options.apiBase && { 'data-api-base': options.apiBase }),
      ...(options.locale && { 'data-locale': options.locale }),
      'defer': true,
    },
  }
  const button: HtmlTag = {
    tagName: 'staticdesk-contact',
    customElement: true,
    attributes: { mode: 'floating', ...(options.widgetId && { 'widget-id': options.widgetId }) },
  }

  return {
    name: 'staticdesk-docusaurus-plugin',

    injectHtmlTags() {
      return { headTags: [script], postBodyTags: options.contactButton ? [button] : [] }
    },

    getThemePath() {
      return fileURLToPath(new URL('./theme', import.meta.url))
    },

    getClientModules() {
      return options.syncColorMode ? [fileURLToPath(new URL('./client/color-mode.js', import.meta.url))] : []
    },
  }
}

/** Lets Docusaurus validate the options before loading the plugin. */
export function validateOptions({ options }: { options: unknown }): NormalizedOptions {
  return normalizeOptions(options)
}
