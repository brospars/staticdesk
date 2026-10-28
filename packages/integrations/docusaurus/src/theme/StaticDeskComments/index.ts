import { createElement } from 'react'

export interface StaticDeskCommentsProps {
  /** Comments widget to show, when the site has several. */
  widgetId?: string
  /** Page identifier. Defaults to the path of the page's canonical URL. */
  pageId?: string
  locale?: string
  /** 'auto', 'light' or 'dark'. Follows the Docusaurus color mode when omitted. */
  theme?: 'auto' | 'light' | 'dark'
  className?: string
}

/**
 * Comments of the page, for MDX pages and swizzled components:
 * import StaticDeskComments from '@theme/StaticDeskComments'
 */
export default function StaticDeskComments({ widgetId, pageId, locale, theme, className }: StaticDeskCommentsProps) {
  return createElement('staticdesk-comments', {
    'widget-id': widgetId,
    'page-id': pageId,
    'locale': locale,
    'theme': theme,
    className,
  })
}
