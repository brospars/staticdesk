import { z } from 'zod'
import { contactSubmissionSchema, isOriginAllowed } from '@staticdesk/core'

const paramsSchema = z.object({ id: z.guid() })
const BUILT_IN_LABELS: Record<string, string> = { name: 'Name', email: 'Email', message: 'Message' }

/**
 * Plain HTML form endpoint: <form action="https://staticdesk.app/f/<widget id>" method="POST">.
 * Works without JavaScript: answers with a redirect or a small HTML page.
 * Clients that ask for JSON (Accept: application/json) get JSON responses.
 */
export default defineEventHandler(async (event) => {
  const wantsJson = (getRequestHeader(event, 'accept') ?? '').includes('application/json')
  const params = paramsSchema.safeParse(getRouterParams(event))
  const site = params.success ? await findPublicForm(event, params.data.id) : null
  if (!params.success || !site) throw createError({ statusCode: 404, statusMessage: 'Unknown form' })

  const origin = formOrigin({ origin: getRequestHeader(event, 'origin'), referer: getRequestHeader(event, 'referer') })
  if (!origin || !isOriginAllowed(origin, site.allowedOrigins, { allowLocalhost: site.settings.allowLocalhost })) {
    throw createError({ statusCode: 403, statusMessage: 'Origin not allowed for this form' })
  }
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' })

  const values = await readFormFields(event)
  const referer = allowedSiteUrl(getRequestHeader(event, 'referer'), site)
  const locale = formPageLocale(site.settings.locale, getRequestHeader(event, 'accept-language'))

  const fail = (statusCode: number, message: string, details: string[] = []) => {
    if (wantsJson) throw createError({ statusCode, statusMessage: message, data: details })
    setResponseStatus(event, statusCode)
    setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return renderFormPage({ locale, outcome: 'error', message, details, backUrl: referer })
  }

  const parsed = contactSubmissionSchema.safeParse({
    name: values.name || undefined,
    email: values.email,
    message: values.message,
  })
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    return fail(400, 'Check the fields below and try again.', Object.entries(errors).map(([name, messages]) => `${BUILT_IN_LABELS[name] ?? name}: ${messages?.[0]}`))
  }

  // Custom fields are posted under their id, next to the built-in ones.
  const form = resolveContactForm(site, params.data.id)
  const fields = Object.fromEntries(form.config.fields
    .filter(field => values[field.id] !== undefined)
    .map(field => [field.id, values[field.id]!]))

  let result
  try {
    result = await submitContactMessage(event, site, {
      ...parsed.data,
      fields,
      widgetId: params.data.id,
      pageId: referer ? new URL(referer).pathname : '/',
      pageUrl: referer ?? undefined,
      website: values._honeypot,
      turnstileToken: values['cf-turnstile-response'],
    })
  }
  catch (error) {
    if (wantsJson || !isError(error)) throw error
    const details = Object.entries((error.data ?? {}) as Record<string, string[]>)
      .map(([id, messages]) => `${form.config.fields.find(field => field.id === id)?.label ?? BUILT_IN_LABELS[id] ?? id}: ${messages[0]}`)
    return fail(error.statusCode, form.config.errorMessage ?? error.statusMessage ?? 'Something went wrong', details)
  }

  if (wantsJson) {
    setResponseStatus(event, 201)
    return { ok: true }
  }

  const redirect = allowedSiteUrl(values._redirect, site) ?? result.form.config.redirectUrl
  if (redirect) return sendRedirect(event, redirect, 303)

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return renderFormPage({ locale, outcome: 'success', message: result.form.config.successMessage, backUrl: referer })
})
