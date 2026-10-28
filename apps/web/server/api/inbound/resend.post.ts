import type { H3Event } from 'h3'
import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

// Subset of the Resend webhook events handled here.
const resendEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email.received'),
    data: z.object({
      email_id: z.string(),
      from: z.string(),
      to: z.array(z.string()).default([]),
      cc: z.array(z.string()).nullish(),
      received_for: z.array(z.string()).nullish(),
      message_id: z.string().nullish(),
      subject: z.string().nullish(),
      attachments: z.array(z.object({ filename: z.string().nullish() })).nullish(),
    }),
  }),
  z.object({
    type: z.literal('email.bounced'),
    data: z.object({
      to: z.array(z.string()),
      bounce: z.object({ type: z.string(), message: z.string().nullish() }).nullish(),
    }),
  }),
  z.object({
    type: z.literal('email.complained'),
    data: z.object({ to: z.array(z.string()) }),
  }),
])

// Resend webhook: visitor replies (inbound emails), bounces and spam complaints.
export default defineEventHandler(async (event) => {
  const { mail } = useRuntimeConfig(event)
  if (!mail.resendWebhookSecret) throw createError({ statusCode: 404, statusMessage: 'Inbound email is not configured' })

  const raw = await readRawBody(event, 'utf8') ?? ''
  const verified = verifySvixSignature(mail.resendWebhookSecret, {
    id: getRequestHeader(event, 'svix-id'),
    timestamp: getRequestHeader(event, 'svix-timestamp'),
    signature: getRequestHeader(event, 'svix-signature'),
  }, raw)
  if (!verified) throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })

  let json: unknown
  try {
    json = JSON.parse(raw)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' })
  }
  const parsed = resendEventSchema.safeParse(json)
  // Other event types are acknowledged so Resend does not retry them.
  if (!parsed.success) return { handled: false }

  const payload = parsed.data
  switch (payload.type) {
    case 'email.received':
      return receiveReply(event, payload.data)
    case 'email.bounced':
      // Transient bounces (full mailbox, greylisting) may succeed later.
      if (payload.data.bounce?.type === 'Transient') return { handled: false }
      await suppress(event, payload.data.to, `Bounce: ${payload.data.bounce?.message ?? payload.data.bounce?.type ?? 'unknown'}`)
      return { handled: true }
    case 'email.complained':
      await suppress(event, payload.data.to, 'Spam complaint')
      return { handled: true }
  }
})

async function suppress(event: H3Event, recipients: string[], reason: string) {
  const supabase = serverSupabaseServiceRole(event)
  for (const address of recipients) {
    const { error } = await supabase.rpc('suppress_email', { address: parseAddress(address).email, reason })
    if (error) {
      console.error('[inbound] could not suppress an address', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Could not store the suppression' })
    }
  }
}

type ReceivedEmail = Extract<z.output<typeof resendEventSchema>, { type: 'email.received' }>['data']

async function receiveReply(event: H3Event, email: ReceivedEmail) {
  const { mail } = useRuntimeConfig(event)
  if (!mail.inboundDomain || !mail.replySecret) return { handled: false }

  const recipients = [...email.to, ...(email.cc ?? []), ...(email.received_for ?? [])]
  const threadId = recipients
    .map(address => parseReplyAddress(mail.replySecret, address, mail.inboundDomain))
    .find(Boolean)
  // Not a reply to a conversation (or a forged address): nothing to do.
  if (!threadId) return { handled: false }

  const resend = useResend()
  if (!resend) throw createError({ statusCode: 503, statusMessage: 'Inbound email needs NUXT_MAIL_DRIVER=resend' })
  const { data: content, error: fetchError } = await resend.emails.receiving.get(email.email_id)
  if (fetchError || !content) {
    console.error('[inbound] could not fetch the email', fetchError?.message)
    throw createError({ statusCode: 502, statusMessage: 'Could not fetch the email' })
  }

  // Ignore out-of-office and other automatic answers.
  const autoSubmitted = Object.entries(content.headers ?? {})
    .find(([name]) => name.toLowerCase() === 'auto-submitted')?.[1]
  if (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') return { handled: false }

  const text = content.text ?? (content.html ? htmlToText(content.html) : '')
  const body = extractReplyText(text) || '(empty message)'
  const attachments = (email.attachments ?? []).map(attachment => attachment.filename).filter((name): name is string => Boolean(name))

  const { data: messageId, error } = await serverSupabaseServiceRole(event).rpc('receive_email_reply', {
    thread_id: threadId,
    body,
    email_message_id: content.message_id || email.message_id || `<${email.email_id}@resend>`,
    from_email: parseAddress(email.from).email,
    metadata: {
      emailId: email.email_id,
      subject: email.subject ?? null,
      ...(attachments.length ? { attachments } : {}),
    },
  })
  if (error) {
    // The thread was deleted since: drop the reply.
    if (error.code === 'P0002') return { handled: false }
    console.error('[inbound] could not store the reply', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not store the reply' })
  }

  if (messageId) event.waitUntil(notifyVisitorReply(event, threadId, body))
  return { handled: true }
}
