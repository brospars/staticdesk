import { z } from 'zod'

import { contactFieldSchema, contactFieldsSchema, type ContactField } from './contact-form'

const text = (max: number) => z.string().trim().min(1).max(max).nullable().catch(null)

export const NAME_FIELD_MODES = ['optional', 'required', 'hidden'] as const

/** Where visitors go after a successful submission: an http(s) URL. */
export const redirectUrlSchema = z.url({ protocol: /^https?$/, error: 'Enter a URL starting with https://' }).max(2000)

/** Keeps the valid custom fields of a stored configuration, dropping the others. */
const storedFields = z.array(z.unknown()).catch([]).transform((values) => {
  const fields: ContactField[] = []
  for (const value of values) {
    const parsed = contactFieldSchema.safeParse(value)
    if (parsed.success && !fields.some(field => field.id === parsed.data.id)) fields.push(parsed.data)
  }
  return fields.slice(0, 20)
})

/** Configuration of a contact widget (widgets.config). Null texts use the translated defaults. */
export const contactWidgetConfigSchema = z.object({
  title: text(120),
  description: text(500),
  buttonLabel: text(40),
  successMessage: text(500),
  errorMessage: text(500),
  /** Page to open after a successful submission instead of the success message. */
  redirectUrl: redirectUrlSchema.nullable().catch(null),
  position: z.enum(['bottom-right', 'bottom-left']).catch('bottom-right'),
  nameField: z.enum(NAME_FIELD_MODES).catch('optional'),
  /** Custom fields shown between the email and the message. */
  fields: storedFields,
  /** Let visitors attach files (see ATTACHMENT_LIMITS). */
  attachments: z.boolean().catch(false),
  /** Email the workspace members about each new message. */
  notifyTeam: z.boolean().catch(true),
})

export type ContactWidgetConfig = z.output<typeof contactWidgetConfigSchema>

export function parseContactWidgetConfig(value: unknown): ContactWidgetConfig {
  return contactWidgetConfigSchema.parse(typeof value === 'object' && value !== null ? value : {})
}

const optionalText = (max: number) => z.string().trim().max(max).transform(value => value || null).nullable()

/** Contact widget form in the dashboard. Empty texts are stored as null (translated defaults). */
export const contactWidgetFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  title: optionalText(120),
  description: optionalText(500),
  buttonLabel: optionalText(40),
  successMessage: optionalText(500),
  errorMessage: optionalText(500),
  redirectUrl: z.union([z.literal('').transform(() => null), redirectUrlSchema]).nullable(),
  position: z.enum(['bottom-right', 'bottom-left']),
  nameField: z.enum(NAME_FIELD_MODES),
  fields: contactFieldsSchema,
  attachments: z.boolean(),
  notifyTeam: z.boolean(),
})

export type ContactWidgetFormInput = z.input<typeof contactWidgetFormSchema>
export type ContactWidgetForm = z.output<typeof contactWidgetFormSchema>
