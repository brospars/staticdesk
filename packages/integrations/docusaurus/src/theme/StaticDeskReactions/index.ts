import { createElement } from 'react'

export interface StaticDeskReactionsProps {
  /** Reactions widget to show, when the site has several. */
  widgetId?: string
  /** Page identifier. Defaults to the path of the page's canonical URL. */
  pageId?: string
  locale?: string
  /** 'auto', 'light' or 'dark'. Follows the Docusaurus color mode when omitted. */
  theme?: 'auto' | 'light' | 'dark'
  className?: string
}

/**
 * "Was this page helpful?" and emoji reactions, for MDX pages and swizzled components:
 * import StaticDeskReactions from '@theme/StaticDeskReactions'
 */
export default function StaticDeskReactions({ widgetId, pageId, locale, theme, className }: StaticDeskReactionsProps) {
  return createElement('staticdesk-reactions', {
    'widget-id': widgetId,
    'page-id': pageId,
    'locale': locale,
    'theme': theme,
    className,
  })
}
