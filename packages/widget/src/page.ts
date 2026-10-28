export interface PageInfo {
  /** Stable identifier: the canonical URL's path, without index.html or a trailing slash. */
  pageId: string
  pageUrl: string
}

export function normalizePath(path: string): string {
  const trimmed = path.replace(/\/index\.html?$/, '/').replace(/\/+$/, '')
  return trimmed || '/'
}

export function currentPage(doc: Document = document): PageInfo {
  const canonical = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
  let path = doc.location.pathname
  if (canonical) {
    try {
      path = new URL(canonical).pathname
    }
    catch {
      // Malformed canonical URL: fall back to the location.
    }
  }
  return { pageId: normalizePath(path), pageUrl: doc.location.href.split('#')[0]! }
}

const NAVIGATE_EVENT = 'staticdesk:navigate'
let patched = false

/**
 * Calls `listener` when a single-page app (Docusaurus, VitePress…) changes the
 * URL path. Returns a function that removes the listener.
 */
export function onNavigate(listener: () => void): () => void {
  if (!patched) {
    patched = true
    let lastPath = location.pathname
    const check = () => {
      if (location.pathname === lastPath) return
      lastPath = location.pathname
      window.dispatchEvent(new Event(NAVIGATE_EVENT))
    }
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method]
      history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
        const result = original.apply(this, args)
        check()
        return result
      }
    }
    window.addEventListener('popstate', check)
  }

  window.addEventListener(NAVIGATE_EVENT, listener)
  return () => window.removeEventListener(NAVIGATE_EVENT, listener)
}
