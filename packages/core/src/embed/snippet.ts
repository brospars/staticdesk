import type { Database } from '../database.types'
import { ATTACHMENT_LIMITS, publicAttachmentLimits } from '../schemas/attachments'
import type { ContactField } from '../schemas/contact-form'

export type WidgetKind = Database['public']['Enums']['widget_kind']

export const WIDGET_KINDS = ['contact', 'comments', 'reactions', 'reviews'] as const satisfies readonly WidgetKind[]

export interface EmbedSnippetOptions {
  /** URL of widget.js, e.g. https://staticdesk.app/widget.js */
  scriptUrl: string
  /** Site public key (pk_…). */
  siteKey: string
  kind: WidgetKind
}

/** Custom element rendered by the widget for each kind. */
export const WIDGET_ELEMENTS: Record<WidgetKind, string> = {
  contact: '<staticdesk-contact mode="floating"></staticdesk-contact>',
  comments: '<staticdesk-comments></staticdesk-comments>',
  reactions: '<staticdesk-reactions></staticdesk-reactions>',
  reviews: '<staticdesk-reviews></staticdesk-reviews>',
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/** HTML to paste into a site: the loader script plus the widget element. */
export function buildEmbedSnippet({ scriptUrl, siteKey, kind }: EmbedSnippetOptions): string {
  const script = `<script src="${escapeAttribute(scriptUrl)}" data-site="${escapeAttribute(siteKey)}" defer></script>`
  return `${script}\n${WIDGET_ELEMENTS[kind]}`
}

function escapeText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Fields of a contact form, as needed to write its plain HTML version. */
export interface HtmlFormOptions {
  /** Form endpoint, e.g. https://staticdesk.app/f/<widget id> */
  actionUrl: string
  nameField: 'optional' | 'required' | 'hidden'
  fields: readonly ContactField[]
  /** Adds a file input; the form is then posted as multipart/form-data. */
  attachments?: boolean
  submitLabel?: string
}

/**
 * A plain HTML contact form that posts to StaticDesk and works without
 * JavaScript. The hidden _honeypot input must stay empty.
 */
export function buildHtmlFormSnippet({ actionUrl, nameField, fields, attachments = false, submitLabel = 'Send' }: HtmlFormOptions): string {
  const field = (label: string, control: string) => `  <label>\n    ${escapeText(label)}\n    ${control}\n  </label>`
  const required = (value: boolean) => value ? ' required' : ''
  const encoding = attachments ? ' enctype="multipart/form-data"' : ''
  const lines = [`<form action="${escapeAttribute(actionUrl)}" method="POST"${encoding}>`]

  if (nameField !== 'hidden') {
    lines.push(field('Name', `<input name="name" autocomplete="name"${required(nameField === 'required')}>`))
  }
  lines.push(field('Email', '<input name="email" type="email" autocomplete="email" required>'))
  for (const custom of fields) {
    const name = escapeAttribute(custom.id)
    const placeholder = custom.placeholder ? ` placeholder="${escapeAttribute(custom.placeholder)}"` : ''
    if (custom.type === 'checkbox') {
      lines.push(`  <label>\n    <input name="${name}" type="checkbox"${required(custom.required)}>\n    ${escapeText(custom.label)}\n  </label>`)
    }
    else if (custom.type === 'select') {
      const options = custom.options.map(option => `      <option>${escapeText(option)}</option>`).join('\n')
      lines.push(field(custom.label, `<select name="${name}"${required(custom.required)}>\n      <option value=""></option>\n${options}\n    </select>`))
    }
    else if (custom.type === 'textarea') {
      lines.push(field(custom.label, `<textarea name="${name}"${placeholder}${required(custom.required)}></textarea>`))
    }
    else {
      lines.push(field(custom.label, `<input name="${name}"${placeholder}${required(custom.required)}>`))
    }
  }
  lines.push(field('Message', '<textarea name="message" required></textarea>'))
  if (attachments) {
    lines.push(`  <!-- Up to ${ATTACHMENT_LIMITS.maxFiles} files, ${ATTACHMENT_LIMITS.maxBytes / 1024 / 1024} MB each. -->`)
    lines.push(field('Attachments', `<input name="attachments" type="file" multiple accept="${publicAttachmentLimits.accept}">`))
  }
  lines.push('  <!-- Anti-spam: keep this field hidden and empty. -->')
  lines.push('  <input name="_honeypot" style="display:none" tabindex="-1" autocomplete="off">')
  lines.push(`  <button type="submit">${escapeText(submitLabel)}</button>`)
  lines.push('</form>')
  return lines.join('\n')
}
