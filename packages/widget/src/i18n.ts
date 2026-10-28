import type { Locale } from '@staticdesk/core'

const en = {
  'contact.button': 'Contact us',
  'contact.title': 'Contact us',
  'contact.description': 'Send us a message and we will reply by email.',
  'contact.name': 'Name',
  'contact.email': 'Email',
  'contact.message': 'Message',
  'contact.optional': 'optional',
  'contact.submit': 'Send message',
  'contact.sending': 'Sending…',
  'contact.successTitle': 'Message sent',
  'contact.success': 'Thanks! We will get back to you soon.',
  'contact.again': 'Send another message',
  'close': 'Close',
  'error.generic': 'Something went wrong. Please try again.',
  'error.rateLimited': 'Too many messages. Please try again later.',
  'error.network': 'Could not reach the server. Check your connection and try again.',
}

export type MessageKey = keyof typeof en

const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  fr: {
    'contact.button': 'Nous contacter',
    'contact.title': 'Nous contacter',
    'contact.description': 'Envoyez-nous un message, nous vous répondrons par email.',
    'contact.name': 'Nom',
    'contact.email': 'Email',
    'contact.message': 'Message',
    'contact.optional': 'facultatif',
    'contact.submit': 'Envoyer le message',
    'contact.sending': 'Envoi…',
    'contact.successTitle': 'Message envoyé',
    'contact.success': 'Merci ! Nous reviendrons vers vous rapidement.',
    'contact.again': 'Envoyer un autre message',
    'close': 'Fermer',
    'error.generic': 'Une erreur est survenue. Veuillez réessayer.',
    'error.rateLimited': 'Trop de messages. Veuillez réessayer plus tard.',
    'error.network': 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
  },
}

function toLocale(value: string | null | undefined): Locale | null {
  const language = value?.toLowerCase().split('-')[0]
  return language && language in messages ? language as Locale : null
}

/** Picks the first supported language among explicit choices, then the browser's. */
export function resolveLocale(
  candidates: (string | null | undefined)[],
  browserLanguages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Locale {
  for (const candidate of [...candidates, ...browserLanguages]) {
    const locale = toLocale(candidate)
    if (locale) return locale
  }
  return 'en'
}

export type Translate = (key: MessageKey) => string

export function translator(locale: Locale): Translate {
  return key => messages[locale][key]
}
