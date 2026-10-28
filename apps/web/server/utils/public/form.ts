import type { H3Event } from 'h3'
import { isOriginAllowed, type Locale } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

import { escapeHtml } from '../../emails/escape'
import type { AttachmentFile } from '../contact/attachments'
import type { PublicSite } from './site'

const WIDGET_TTL_MS = 30_000
const widgetSites = new Map<string, { publicKey: string | null, expires: number }>()

/** Site of an enabled contact widget, for plain HTML forms posting to /f/:widgetId. */
export async function findPublicForm(event: H3Event, widgetId: string): Promise<PublicSite | null> {
  let cached = widgetSites.get(widgetId)
  if (!cached || cached.expires <= Date.now()) {
    const { data, error } = await serverSupabaseServiceRole(event)
      .from('widgets')
      .select('sites(public_key)')
      .eq('id', widgetId)
      .eq('kind', 'contact')
      .maybeSingle()
    if (error) throw createError({ statusCode: 500, statusMessage: 'Could not load the form' })
    if (widgetSites.size > 10_000) widgetSites.clear()
    cached = { publicKey: data?.sites?.public_key ?? null, expires: Date.now() + WIDGET_TTL_MS }
    widgetSites.set(widgetId, cached)
  }
  if (!cached.publicKey) return null

  const site = await findPublicSite(event, cached.publicKey)
  // Disabled widgets are not listed on the site.
  return site?.widgets.some(widget => widget.id === widgetId) ? site : null
}

/**
 * Origin of the page that posted a form. Browsers send Origin with cross-origin
 * POSTs; Referer is the fallback for older ones. Null when neither is usable.
 */
export function formOrigin(headers: { origin?: string, referer?: string }): string | null {
  if (headers.origin && headers.origin !== 'null') return headers.origin
  try {
    return headers.referer ? new URL(headers.referer).origin : null
  }
  catch {
    return null
  }
}

/** A URL on one of the site's allowed origins, or null. Prevents open redirects. */
export function allowedSiteUrl(value: string | undefined, site: PublicSite): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return isOriginAllowed(url.origin, site.allowedOrigins, { allowLocalhost: site.settings.allowLocalhost }) ? url.href : null
  }
  catch {
    return null
  }
}

/**
 * Reads a urlencoded or multipart form body: single string values, and the
 * files of multipart bodies (empty file inputs are skipped).
 */
export async function readFormSubmission(event: H3Event): Promise<{ values: Record<string, string>, files: AttachmentFile[] }> {
  const type = getRequestHeader(event, 'content-type') ?? ''
  const values: Record<string, string> = {}
  const files: AttachmentFile[] = []

  if (type.startsWith('multipart/form-data')) {
    for (const part of await readMultipartFormData(event) ?? []) {
      if (part.filename !== undefined) {
        if (part.filename && part.data.length) files.push({ name: part.filename, type: part.type || 'application/octet-stream', data: part.data })
      }
      else if (part.name) {
        values[part.name] = part.data.toString('utf8')
      }
    }
    return { values, files }
  }
  if (type.startsWith('application/x-www-form-urlencoded')) {
    for (const [name, value] of new URLSearchParams(await readRawBody(event, 'utf8') ?? '')) values[name] = value
    return { values, files }
  }
  throw createError({ statusCode: 415, statusMessage: 'Send the form as application/x-www-form-urlencoded or multipart/form-data' })
}

const pageText: Record<Locale, Record<'successTitle' | 'success' | 'errorTitle' | 'back', string>> = {
  en: {
    successTitle: 'Message sent',
    success: 'Thanks! We will get back to you soon.',
    errorTitle: 'Your message was not sent',
    back: 'Go back',
  },
  fr: {
    successTitle: 'Message envoyé',
    success: 'Merci ! Nous reviendrons vers vous rapidement.',
    errorTitle: 'Votre message n\'a pas été envoyé',
    back: 'Retour',
  },
}

/** Picks the page language: the site's setting, then the visitor's Accept-Language. */
export function formPageLocale(siteLocale: Locale | null, acceptLanguage: string | undefined): Locale {
  if (siteLocale) return siteLocale
  const first = acceptLanguage?.split(',')[0]?.trim().slice(0, 2).toLowerCase()
  return first === 'fr' ? 'fr' : 'en'
}

/** Minimal page shown after a plain HTML form submission when no redirect is configured. */
export function renderFormPage(options: {
  locale: Locale
  outcome: 'success' | 'error'
  message?: string | null
  details?: string[]
  backUrl: string | null
}): string {
  const text = pageText[options.locale]
  const title = options.outcome === 'success' ? text.successTitle : text.errorTitle
  const message = options.message ?? (options.outcome === 'success' ? text.success : '')
  const details = options.details?.length
    ? `<ul>${options.details.map(detail => `<li>${escapeHtml(detail)}</li>`).join('')}</ul>`
    : ''
  const back = options.backUrl ? `<p><a href="${escapeHtml(options.backUrl)}">${escapeHtml(text.back)}</a></p>` : ''

  return `<!doctype html>
<html lang="${options.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 420px; padding: 32px 24px; text-align: center; }
h1 { font-size: 24px; margin: 0 0 8px; }
ul { text-align: left; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
${message ? `<p>${escapeHtml(message)}</p>` : ''}
${details}
${back}
</main>
</body>
</html>`
}
