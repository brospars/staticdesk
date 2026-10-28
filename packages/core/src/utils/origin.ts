const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function parseOrigin(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  }
  catch {
    return null
  }
}

/**
 * Checks a request Origin against a site's allowed origins.
 * Entries are exact origins ("https://docs.acme.dev") or wildcard subdomains
 * ("https://*.acme.dev", which does not match the apex "https://acme.dev").
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
  options: { allowLocalhost?: boolean } = {},
): boolean {
  if (!origin) return false
  const url = parseOrigin(origin)
  if (!url || url.origin !== origin) return false

  if (options.allowLocalhost && url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) {
    return true
  }

  return allowedOrigins.some((entry) => {
    const wildcard = entry.match(/^(https?):\/\/\*\.([^/:]+)(:\d+)?$/)
    if (wildcard) {
      const [, protocol, domain, port = ''] = wildcard
      return url.protocol === `${protocol}:`
        && url.hostname.endsWith(`.${domain}`)
        && (url.port ? `:${url.port}` : '') === port
    }
    return parseOrigin(entry)?.origin === origin
  })
}
