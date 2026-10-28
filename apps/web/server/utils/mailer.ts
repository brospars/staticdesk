import { Resend } from 'resend'

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export interface Mailer {
  send(message: MailMessage): Promise<void>
}

/** Prints emails instead of sending them. Default in development. */
const logMailer: Mailer = {
  async send(message) {
    console.info(`[mail] To: ${message.to}\n[mail] Subject: ${message.subject}\n${message.text}`)
  },
}

function createResendMailer(apiKey: string, from: string): Mailer {
  const resend = new Resend(apiKey)
  return {
    async send(message) {
      const { error } = await resend.emails.send({ from, ...message })
      if (error) throw new Error(`Resend: ${error.message}`)
    },
  }
}

let mailer: Mailer | undefined

/** Returns the mailer configured by NUXT_MAIL_DRIVER ('log' or 'resend'). */
export function useMailer(): Mailer {
  if (mailer) return mailer

  const { mail } = useRuntimeConfig()
  if (mail.driver === 'resend') {
    if (!mail.resendApiKey) throw new Error('NUXT_MAIL_RESEND_API_KEY is required when NUXT_MAIL_DRIVER=resend')
    mailer = createResendMailer(mail.resendApiKey, mail.from)
  }
  else {
    mailer = logMailer
  }
  return mailer
}
