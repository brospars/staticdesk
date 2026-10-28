import { z } from 'zod'

export const CONTACT_FIELD_TYPES = ['text', 'textarea', 'select', 'checkbox'] as const
export type ContactFieldType = (typeof CONTACT_FIELD_TYPES)[number]

/** Names used by the built-in fields; custom fields cannot take them. */
export const RESERVED_FIELD_IDS = ['name', 'email', 'message'] as const

/** Maximum length of a submitted value, per field type. */
export const FIELD_VALUE_MAX_LENGTH: Record<Exclude<ContactFieldType, 'checkbox'>, number> = {
  text: 500,
  textarea: 5000,
  select: 120,
}

/**
 * A custom field of a contact form. The id is the key of its value in
 * submissions, and the input name in plain HTML forms, so it cannot start with
 * "_" (reserved for options such as _redirect).
 */
export const contactFieldSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, 'Use lowercase letters, numbers and underscores')
    .refine(id => !(RESERVED_FIELD_IDS as readonly string[]).includes(id), 'This name is used by a built-in field'),
  type: z.enum(CONTACT_FIELD_TYPES),
  label: z.string().trim().min(1, 'Label is required').max(120),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(120).nullable().default(null),
  /** Choices of a select field. */
  options: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
}).refine(field => field.type !== 'select' || field.options.length > 0, {
  message: 'Add at least one option',
  path: ['options'],
})

export type ContactField = z.output<typeof contactFieldSchema>
export type ContactFieldInput = z.input<typeof contactFieldSchema>

/** Custom fields of a form: up to 20, with unique ids. */
export const contactFieldsSchema = z.array(contactFieldSchema).max(20, 'Up to 20 fields')
  .refine(fields => new Set(fields.map(field => field.id)).size === fields.length, 'Field names must be unique')

/** Raw values sent for the custom fields, before they are checked against the form. */
export const contactFieldValuesInputSchema = z.record(
  z.string().max(40),
  z.union([z.string().max(5000), z.boolean()]),
)

export type ContactFieldValues = Record<string, string | boolean>

const REQUIRED = 'This field is required'

// Missing keys are validated too (no .optional()), so required fields cannot be left out.
function valueSchema(field: ContactField) {
  if (field.type === 'checkbox') {
    // HTML forms send "on" (or the input's value) for checked boxes and nothing otherwise.
    const checked = (raw: unknown) => raw === true || (typeof raw === 'string' && raw !== '' && raw !== 'false')
    return z.preprocess(checked, field.required ? z.literal(true, 'This box must be checked') : z.boolean())
  }

  // Empty strings count as missing values.
  const empty = (raw: unknown) => typeof raw === 'string' && raw.trim() === '' ? undefined : raw
  const text = field.type === 'select'
    ? z.enum(field.options as [string, ...string[]], {
        error: issue => issue.input === undefined ? REQUIRED : 'Choose one of the options',
      })
    : z.string({ error: REQUIRED }).trim().max(FIELD_VALUE_MAX_LENGTH[field.type])
  return z.preprocess(empty, field.required ? text : text.optional())
}

/** Builds the schema that validates submitted values against a form's custom fields. Unknown keys are dropped. */
export function contactFieldValuesSchema(fields: readonly ContactField[]) {
  return z.object(Object.fromEntries(fields.map(field => [field.id, valueSchema(field)])))
    .transform(values => Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined && value !== false),
    ) as ContactFieldValues)
}

// A type alias rather than an interface, so it stays assignable to the database's Json type.
export type ContactFieldEntry = {
  id: string
  label: string
  value: string
}

/** Values as label/value pairs in the form's order, for emails, webhooks and the inbox. */
export function describeFieldValues(fields: readonly ContactField[], values: ContactFieldValues): ContactFieldEntry[] {
  return fields.flatMap((field) => {
    const value = values[field.id]
    if (value === undefined || value === false) return []
    return [{ id: field.id, label: field.label, value: value === true ? 'Yes' : value }]
  })
}
