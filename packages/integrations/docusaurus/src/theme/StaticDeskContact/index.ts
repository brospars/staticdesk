import { createElement } from 'react'

export interface StaticDeskContactProps {
  /** Contact widget to show, when the site has several. */
  widgetId?: string
  /** 'inline' (default) renders the form in the page; 'floating' adds a button. */
  mode?: 'inline' | 'floating'
  locale?: string
  /** 'auto', 'light' or 'dark'. Follows the Docusaurus color mode when omitted. */
  theme?: 'auto' | 'light' | 'dark'
  className?: string
}

/**
 * Contact form for MDX pages and swizzled components:
 * import StaticDeskContact from '@theme/StaticDeskContact'
 */
export default function StaticDeskContact({ widgetId, mode = 'inline', locale, theme, className }: StaticDeskContactProps) {
  return createElement('staticdesk-contact', {
    'mode': mode === 'floating' ? 'floating' : undefined,
    'widget-id': widgetId,
    'locale': locale,
    'theme': theme,
    className,
  })
}
