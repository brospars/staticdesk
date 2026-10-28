import type { Database } from '../database.types'

export type WidgetKind = Database['public']['Enums']['widget_kind']

export const WIDGET_KINDS = ['contact', 'comments', 'reactions', 'reviews'] as const satisfies readonly WidgetKind[]

export interface EmbedSnippetOptions {
  /** URL of widget.js, e.g. https://staticdesk.app/widget.js */
  scriptUrl: string
  /** Site public key (pk_…). */
  siteKey: string
  kind: WidgetKind
}

/** Custom element rendered by the widget for each kind. */
export const WIDGET_ELEMENTS: Record<WidgetKind, string> = {
  contact: '<staticdesk-contact mode="floating"></staticdesk-contact>',
  comments: '<staticdesk-comments></staticdesk-comments>',
  reactions: '<staticdesk-reactions></staticdesk-reactions>',
  reviews: '<staticdesk-reviews></staticdesk-reviews>',
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/** HTML to paste into a site: the loader script plus the widget element. */
export function buildEmbedSnippet({ scriptUrl, siteKey, kind }: EmbedSnippetOptions): string {
  const script = `<script src="${escapeAttribute(scriptUrl)}" data-site="${escapeAttribute(siteKey)}" defer></script>`
  return `${script}\n${WIDGET_ELEMENTS[kind]}`
}
