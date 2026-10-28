import type { Locale } from '@staticdesk/core'

const en = {
  'contact.button': 'Contact us',
  'contact.title': 'Contact us',
  'contact.description': 'Send us a message and we will reply by email.',
  'contact.name': 'Name',
  'contact.email': 'Email',
  'contact.message': 'Message',
  'contact.optional': 'optional',
  'contact.choose': 'Choose…',
  'contact.submit': 'Send message',
  'contact.sending': 'Sending…',
  'contact.successTitle': 'Message sent',
  'contact.success': 'Thanks! We will get back to you soon.',
  'contact.again': 'Send another message',
  'contact.attachments': 'Attachments',
  'contact.attachmentsHint': 'Up to {count} files, {size} MB each.',
  'close': 'Close',
  'error.generic': 'Something went wrong. Please try again.',
  'error.rateLimited': 'Too many messages. Please try again later.',
  'error.network': 'Could not reach the server. Check your connection and try again.',
  'error.tooManyFiles': 'Attach at most {count} files.',
  'error.fileTooLarge': '{name} is too large.',
  'error.fileType': '{name}: this file type is not accepted.',
  'error.upload': '{name} could not be uploaded. Please try again.',
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
    'contact.choose': 'Choisir…',
    'contact.submit': 'Envoyer le message',
    'contact.sending': 'Envoi…',
    'contact.successTitle': 'Message envoyé',
    'contact.success': 'Merci ! Nous reviendrons vers vous rapidement.',
    'contact.again': 'Envoyer un autre message',
    'contact.attachments': 'Pièces jointes',
    'contact.attachmentsHint': 'Jusqu\'à {count} fichiers, {size} Mo chacun.',
    'close': 'Fermer',
    'error.generic': 'Une erreur est survenue. Veuillez réessayer.',
    'error.rateLimited': 'Trop de messages. Veuillez réessayer plus tard.',
    'error.network': 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
    'error.tooManyFiles': 'Joignez au plus {count} fichiers.',
    'error.fileTooLarge': '{name} est trop volumineux.',
    'error.fileType': '{name} : ce type de fichier n\'est pas accepté.',
    'error.upload': 'Impossible d\'envoyer {name}. Veuillez réessayer.',
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

/** Returns the message in the locale, with {placeholders} replaced by the values. */
export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string

export function translator(locale: Locale): Translate {
  return (key, values) => messages[locale][key].replace(/\{(\w+)\}/g, (match, name: string) => String(values?.[name] ?? match))
}
