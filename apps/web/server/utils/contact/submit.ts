import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { z } from 'zod'
import {
  contactFieldValuesSchema,
  describeFieldValues,
  parseContactWidgetConfig,
  type ContactFieldValues,
  type ContactSubmittedPayload,
  type ContactWidgetConfig,
} from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

import { newMessageEmail } from '../../emails/new-message'
import type { PublicSite } from '../public/site'

export interface ContactSubmissionInput {
  name?: string
  email: string
  message: string
  fields?: Record<string, string | boolean>
  widgetId?: string
  pageId: string
  pageUrl?: string
  website?: string
  elapsedMs?: number
  turnstileToken?: string
}

export interface ContactForm {
  widget: { id: string, name: string } | null
  config: ContactWidgetConfig
}

/** The contact widget a submission is for. Unknown ids fall back to the default form without a widget. */
export function resolveContactForm(site: PublicSite, widgetId: string | undefined): ContactForm {
  const widget = site.widgets.find(candidate => candidate.kind === 'contact' && candidate.id === widgetId)
  return {
    widget: widget ? { id: widget.id, name: widget.name } : null,
    config: parseContactWidgetConfig(widget?.config),
  }
}

export type FieldErrors = Record<string, string[]>

export type FieldValidation = { ok: true, name: string | undefined, values: ContactFieldValues } | { ok: false, errors: FieldErrors }

/** Checks the name and custom fields against the form. Returns the values or the errors per field. */
export function validateContactFields(config: ContactWidgetConfig, input: Pick<ContactSubmissionInput, 'name' | 'fields'>): FieldValidation {
  const errors: FieldErrors = {}
  const name = config.nameField === 'hidden' ? undefined : input.name?.trim() || undefined
  if (config.nameField === 'required' && !name) errors.name = ['This field is required']

  const parsed = contactFieldValuesSchema(config.fields).safeParse(input.fields ?? {})
  if (!parsed.success) Object.assign(errors, z.flattenError(parsed.error).fieldErrors)

  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, name, values: parsed.data }
}

export type ContactSubmissionResult = { status: 'stored', threadId: string, form: ContactForm } | { status: 'ignored', form: ContactForm }

/**
 * Shared by the widget API and plain HTML forms: anti-spam checks, field
 * validation, storage, then the team email, webhooks and auto-replies after
 * the response.
 * Throws HTTP errors (400 with field errors, 429).
 */
export async function submitContactMessage(event: H3Event, site: PublicSite, input: ContactSubmissionInput): Promise<ContactSubmissionResult> {
  const form = resolveContactForm(site, input.widgetId)

  // Bots get a success response so they do not adapt; nothing is stored.
  if (isLikelyBot(input)) return { status: 'ignored', form }

  const fingerprint = visitorFingerprint(event, site.id)
  await enforceRateLimit(event, `contact:${site.id}:${fingerprint}`, 600, 5)
  await enforceRateLimit(event, `contact:${site.id}`, 3600, 200)

  const config = useRuntimeConfig(event)
  if (site.settings.turnstile && config.turnstileSecretKey) {
    const ip = getRequestIP(event, { xForwardedFor: Boolean(config.trustProxy) })
    if (!await verifyTurnstile(input.turnstileToken, String(config.turnstileSecretKey), ip)) {
      throw createError({ statusCode: 400, statusMessage: 'The anti-spam challenge failed, please try again' })
    }
  }

  const validation = validateContactFields(form.config, input)
  if (!validation.ok) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission', data: validation.errors })
  }
  const fields = describeFieldValues(form.config.fields, validation.values)

  const { data: threadId, error } = await serverSupabaseServiceRole(event).rpc('submit_contact', {
    site_id: site.id,
    email: input.email,
    message: input.message,
    page_id: input.pageId,
    widget_id: form.widget?.id,
    name: validation.name,
    page_url: input.pageUrl,
    fields,
  })
  if (error) {
    console.error('[contact] submit_contact failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not send your message' })
  }

  const payload: ContactSubmittedPayload = {
    type: 'contact.submitted',
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    site: { id: site.id, name: site.name },
    widget: form.widget,
    threadId,
    contact: { email: input.email.toLowerCase(), name: validation.name ?? null },
    message: input.message,
    fields,
    page: { id: input.pageId, url: input.pageUrl ?? null },
  }
  // Notifications and auto-replies must not slow down or fail the visitor's request.
  event.waitUntil(Promise.allSettled([
    form.config.notifyTeam ? notifyTeam(event, site, payload) : Promise.resolve(),
    dispatchContactWebhooks(event, site.id, payload),
    runAutomation(event, site.workspaceId, payload),
  ]))

  return { status: 'stored', threadId, form }
}

/** Emails the workspace members who follow new conversations about a new message. */
async function notifyTeam(event: H3Event, site: PublicSite, payload: ContactSubmittedPayload) {
  const { data: recipients, error } = await serverSupabaseServiceRole(event)
    .rpc('workspace_notification_emails', { ws: site.workspaceId, kind: 'new_thread' })
  if (error) {
    console.error('[contact] could not list the members to notify', error.message)
    return
  }

  const mailer = useMailer()
  const dashboardUrl = threadUrl(event, payload.threadId)
  const results = await Promise.allSettled(recipients.map(to => mailer.send(newMessageEmail({
    to,
    siteName: site.name,
    contact: payload.contact,
    message: payload.message,
    fields: payload.fields,
    pageUrl: payload.page.url,
    dashboardUrl,
  }))))
  for (const result of results) {
    if (result.status === 'rejected') console.error('[contact] notification email failed', result.reason)
  }
}
