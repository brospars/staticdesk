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

/** Returns the mailer configured by NUXT_MAIL_DRIVER ('log' or 'resend'). */
export function useMailer(): Mailer {
  if (mailer) return mailer

  const client = useResend()
  mailer = client ? createResendMailer(client, useRuntimeConfig().mail.from) : logMailer
  return mailer
}
