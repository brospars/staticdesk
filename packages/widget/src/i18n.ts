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
  'reactions.helpful': 'Was this page helpful?',
  'reactions.yes': 'Yes',
  'reactions.no': 'No',
  'reactions.thanks': 'Thanks for your feedback!',
  'reactions.improve': 'What could we improve?',
  'reactions.send': 'Send',
  'reactions.sent': 'Thanks, your comment helps us improve this page.',
  'reactions.label': 'Reactions',
  'reactions.emoji': 'React with {emoji} ({count})',
  'comments.title': 'Comments',
  'comments.empty': 'No comments yet. Start the conversation!',
  'comments.name': 'Name',
  'comments.anonymousHint': 'Leave empty to post anonymously.',
  'comments.body': 'Comment',
  'comments.write': 'Write',
  'comments.preview': 'Preview',
  'comments.nothing': 'Nothing to preview.',
  'comments.markdown': 'Supports **bold**, *italic*, `code` and links.',
  'comments.submit': 'Post comment',
  'comments.submitReply': 'Post reply',
  'comments.posting': 'Posting…',
  'comments.reply': 'Reply',
  'comments.cancel': 'Cancel',
  'comments.edit': 'Edit',
  'comments.save': 'Save',
  'comments.delete': 'Delete',
  'comments.confirmDelete': 'Delete this comment?',
  'comments.deleted': 'This comment was deleted.',
  'comments.edited': 'edited',
  'comments.visitor': 'Visitor #{id}',
  'comments.anonymous': 'Anonymous',
  'comments.pending': 'Awaiting moderation',
  'comments.pendingNotice': 'Thanks! Your comment will appear once a moderator approves it.',
  'comments.more': 'Load more comments',
  'comments.loadError': 'Could not load the comments.',
  'comments.retry': 'Try again',
  'comments.editClosed': 'This comment can no longer be edited.',
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
    'reactions.helpful': 'Cette page vous a-t-elle été utile ?',
    'reactions.yes': 'Oui',
    'reactions.no': 'Non',
    'reactions.thanks': 'Merci pour votre retour !',
    'reactions.improve': 'Que pourrions-nous améliorer ?',
    'reactions.send': 'Envoyer',
    'reactions.sent': 'Merci, votre commentaire nous aide à améliorer cette page.',
    'reactions.label': 'Réactions',
    'reactions.emoji': 'Réagir avec {emoji} ({count})',
    'comments.title': 'Commentaires',
    'comments.empty': 'Aucun commentaire pour l\'instant. Lancez la discussion !',
    'comments.name': 'Nom',
    'comments.anonymousHint': 'Laissez vide pour publier anonymement.',
    'comments.body': 'Commentaire',
    'comments.write': 'Écrire',
    'comments.preview': 'Aperçu',
    'comments.nothing': 'Rien à afficher.',
    'comments.markdown': 'Accepte **gras**, *italique*, `code` et les liens.',
    'comments.submit': 'Publier',
    'comments.submitReply': 'Publier la réponse',
    'comments.posting': 'Publication…',
    'comments.reply': 'Répondre',
    'comments.cancel': 'Annuler',
    'comments.edit': 'Modifier',
    'comments.save': 'Enregistrer',
    'comments.delete': 'Supprimer',
    'comments.confirmDelete': 'Supprimer ce commentaire ?',
    'comments.deleted': 'Ce commentaire a été supprimé.',
    'comments.edited': 'modifié',
    'comments.visitor': 'Visiteur #{id}',
    'comments.anonymous': 'Anonyme',
    'comments.pending': 'En attente de modération',
    'comments.pendingNotice': 'Merci ! Votre commentaire apparaîtra après validation par un modérateur.',
    'comments.more': 'Afficher plus de commentaires',
    'comments.loadError': 'Impossible de charger les commentaires.',
    'comments.retry': 'Réessayer',
    'comments.editClosed': 'Ce commentaire ne peut plus être modifié.',
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
