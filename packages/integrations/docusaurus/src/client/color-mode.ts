// Client module: keeps the widgets in the site's color mode. Docusaurus sets
// data-theme="light" or "dark" on <html> and changes it with the toggle.

const SELECTOR = 'staticdesk-contact, staticdesk-comments, staticdesk-reactions, staticdesk-reviews'

/** Copies the page's color mode to the theme attribute of every StaticDesk element without its own. */
export function syncColorMode(root: Document = document) {
  const mode = root.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  for (const element of root.querySelectorAll<HTMLElement>(SELECTOR)) {
    if (element.dataset.staticdeskTheme === 'own') continue
    if (element.hasAttribute('theme') && element.dataset.staticdeskTheme !== 'synced') {
      // Set by the author: leave it alone.
      element.dataset.staticdeskTheme = 'own'
      continue
    }
    element.dataset.staticdeskTheme = 'synced'
    if (element.getAttribute('theme') !== mode) element.setAttribute('theme', mode)
  }
}

if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  // Covers the toggle (attribute change) and elements added by client-side navigation.
  const observer = new MutationObserver(() => syncColorMode())
  const start = () => {
    syncColorMode()
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    observer.observe(document.body, { childList: true, subtree: true })
  }
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, { once: true })
}
