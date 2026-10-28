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

/** Which comments wait for a moderator before they are published. */
export const COMMENT_MODERATION_MODES = ['none', 'anonymous', 'all'] as const

/** Keeps the valid, unique entries of a stored list. */
function storedList<T extends z.ZodType<string>>(item: T, max: number) {
  return z.array(z.unknown()).catch([]).transform((values) => {
    const items: string[] = []
    for (const value of values) {
      const parsed = item.safeParse(value)
      if (parsed.success && !items.includes(parsed.data)) items.push(parsed.data)
    }
    return items.slice(0, max)
  })
}

const bannedWordSchema = z.string().trim().toLowerCase().min(1).max(60)

/** Configuration of a comments widget (widgets.config). */
export const commentsWidgetConfigSchema = z.object({
  title: text(120),
  /** Let visitors post without a name. */
  allowAnonymous: z.boolean().catch(true),
  moderation: z.enum(COMMENT_MODERATION_MODES).catch('anonymous'),
  /** Comments containing one of these words (case-insensitive) wait for approval. */
  bannedWords: storedList(bannedWordSchema, 200),
  sort: z.enum(['oldest', 'newest']).catch('oldest'),
})

export type CommentsWidgetConfig = z.output<typeof commentsWidgetConfigSchema>

export function parseCommentsWidgetConfig(value: unknown): CommentsWidgetConfig {
  return commentsWidgetConfigSchema.parse(typeof value === 'object' && value !== null ? value : {})
}

/** Comments widget form in the dashboard. */
export const commentsWidgetFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  title: optionalText(120),
  allowAnonymous: z.boolean(),
  moderation: z.enum(COMMENT_MODERATION_MODES),
  bannedWords: z.array(bannedWordSchema).max(200, 'Up to 200 words'),
  sort: z.enum(['oldest', 'newest']),
})

export type CommentsWidgetFormInput = z.input<typeof commentsWidgetFormSchema>
export type CommentsWidgetForm = z.output<typeof commentsWidgetFormSchema>

// One emoji, possibly with modifiers and joiners (👍🏽, 👩‍💻, ❤️).
const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️)+$/u

export const emojiSchema = z.string().trim().max(16).regex(EMOJI, 'Use a single emoji')

/** Configuration of a reactions widget (widgets.config). */
export const reactionsWidgetConfigSchema = z.object({
  /** Question above the helpful / not helpful buttons. */
  title: text(120),
  /** Show "Was this page helpful?" with yes and no buttons. */
  helpful: z.boolean().catch(true),
  /** After a "no", ask what could be improved. */
  askComment: z.boolean().catch(true),
  /** Emoji reactions with a public counter. */
  emojis: storedList(emojiSchema, 8),
})

export type ReactionsWidgetConfig = z.output<typeof reactionsWidgetConfigSchema>

export function parseReactionsWidgetConfig(value: unknown): ReactionsWidgetConfig {
  return reactionsWidgetConfigSchema.parse(typeof value === 'object' && value !== null ? value : {})
}

/** Reactions widget form in the dashboard. */
export const reactionsWidgetFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  title: optionalText(120),
  helpful: z.boolean(),
  askComment: z.boolean(),
  emojis: z.array(emojiSchema).max(8, 'Up to 8 emojis')
    .refine(emojis => new Set(emojis).size === emojis.length, 'Each emoji can only be listed once'),
}).refine(form => form.helpful || form.emojis.length > 0, { message: 'Enable the helpful question or add an emoji', path: ['emojis'] })

export type ReactionsWidgetFormInput = z.input<typeof reactionsWidgetFormSchema>
export type ReactionsWidgetForm = z.output<typeof reactionsWidgetFormSchema>
