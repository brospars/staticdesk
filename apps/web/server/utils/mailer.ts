import { createTransport } from 'nodemailer'
import { Resend } from 'resend'

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
  /** Sender, as `Name <address>`. Defaults to NUXT_MAIL_FROM. */
  from?: string
  replyTo?: string
  headers?: Record<string, string>
}

export interface SentMail {
  /** Provider id of the email, when the driver has one. */
  id: string | null
}

export interface Mailer {
  send(message: MailMessage): Promise<SentMail>
}

/** Prints emails instead of sending them. Default in development. */
const logMailer: Mailer = {
  async send(message) {
    const replyTo = message.replyTo ? `\n[mail] Reply-To: ${message.replyTo}` : ''
    console.info(`[mail] To: ${message.to}${replyTo}\n[mail] Subject: ${message.subject}\n${message.text}`)
    return { id: null }
  },
}

function createResendMailer(resend: Resend, from: string): Mailer {
  return {
    async send(message) {
      const { data, error } = await resend.emails.send({ ...message, from: message.from ?? from })
      if (error) throw new Error(`Resend: ${error.message}`)
      return { id: data?.id ?? null }
    },
  }
}

interface SmtpOptions {
  host: string
  port: number
  /** TLS from the start (port 465). Otherwise STARTTLS is used when the server offers it. */
  secure: boolean
  user: string
  pass: string
}

/** Sends through any SMTP server (self-hosting without Resend). */
export function createSmtpMailer(options: SmtpOptions, from: string): Mailer {
  const transport = createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.user ? { user: options.user, pass: options.pass } : undefined,
  })
  return {
    async send(message) {
      const info = await transport.sendMail({
        from: message.from ?? from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: message.headers,
      })
      return { id: info.messageId ?? null }
    },
  }
}

let mailer: Mailer | undefined
let resend: Resend | null | undefined

/**
 * The Resend client when NUXT_MAIL_DRIVER=resend, else null. Used for inbound
 * emails and sending domains, which need the Resend API.
 */
export function useResend(): Resend | null {
  if (resend !== undefined) return resend

  const { mail } = useRuntimeConfig()
  if (mail.driver === 'resend') {
    if (!mail.resendApiKey) throw new Error('NUXT_MAIL_RESEND_API_KEY is required when NUXT_MAIL_DRIVER=resend')
    resend = new Resend(mail.resendApiKey)
  }
  else {
    resend = null
  }
  return resend
}

/** Returns the mailer configured by NUXT_MAIL_DRIVER ('log', 'resend' or 'smtp'). */
export function useMailer(): Mailer {
  if (mailer) return mailer

  const { mail } = useRuntimeConfig()
  if (mail.driver === 'smtp') {
    if (!mail.smtpHost) throw new Error('NUXT_MAIL_SMTP_HOST is required when NUXT_MAIL_DRIVER=smtp')
    mailer = createSmtpMailer({
      host: String(mail.smtpHost),
      port: Number(mail.smtpPort) || 587,
      secure: String(mail.smtpSecure) === 'true',
      user: String(mail.smtpUser ?? ''),
      pass: String(mail.smtpPass ?? ''),
    }, mail.from)
    return mailer
  }
  const client = useResend()
  mailer = client ? createResendMailer(client, mail.from) : logMailer
  return mailer
}
