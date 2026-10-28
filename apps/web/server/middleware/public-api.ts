const PUBLIC_SITE_ROUTE = /^\/api\/v1\/public\/sites\/([^/]+)\//

/**
 * Resolves the site of every /api/v1/public/sites/:key/* request, enforces the
 * site's allowed origins and answers CORS preflight requests.
 */
export default defineEventHandler(async (event) => {
  const match = event.path.match(PUBLIC_SITE_ROUTE)
  if (!match) return

  const site = await findPublicSite(event, decodeURIComponent(match[1]!))
  if (!site) throw createError({ statusCode: 404, statusMessage: 'Unknown site' })

  const decision = corsDecision(event.method, getRequestHeader(event, 'origin'), site)
  if (!decision.allowed) {
    throw createError({ statusCode: 403, statusMessage: 'Origin not allowed for this site' })
  }
  setResponseHeaders(event, decision.headers)

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }

  event.context.publicSite = site
})
