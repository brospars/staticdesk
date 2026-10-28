import { z } from 'zod'

export const THREAD_STATUSES = ['open', 'pending', 'resolved'] as const
export type ThreadStatus = (typeof THREAD_STATUSES)[number]

export const threadStatusSchema = z.enum(THREAD_STATUSES)

export const MAX_MESSAGE_LENGTH = 50000

/** Reply to a visitor from the dashboard, optionally changing the thread status. */
export const threadReplySchema = z.object({
  body: z.string().trim().min(1, 'Write a reply').max(MAX_MESSAGE_LENGTH),
  status: threadStatusSchema.optional(),
})

export type ThreadReplyInput = z.input<typeof threadReplySchema>

/** Internal note on a thread, visible to the team only. */
export const threadNoteSchema = z.object({
  body: z.string().trim().min(1, 'Write a note').max(MAX_MESSAGE_LENGTH),
})

export const MAX_THREAD_LABELS = 20

/** Labels are short, lowercase and trimmed. */
export const threadLabelSchema = z.string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(40, 'Use at most 40 characters')
  .regex(/^[^,]+$/, 'Labels cannot contain commas')

export const threadLabelsSchema = z.array(threadLabelSchema)
  .max(MAX_THREAD_LABELS, `Use at most ${MAX_THREAD_LABELS} labels`)
  .transform(labels => [...new Set(labels)])

/** Inbox filters, as found in the inbox URL query. */
export const inboxFiltersSchema = z.object({
  status: z.enum([...THREAD_STATUSES, 'all']).catch('open').default('open'),
  site: z.guid().optional().catch(undefined),
  // 'me', 'unassigned' or a member id.
  assignee: z.union([z.enum(['me', 'unassigned']), z.guid()]).optional().catch(undefined),
  label: z.string().trim().min(1).max(40).optional().catch(undefined),
  q: z.string().trim().min(1).max(200).optional().catch(undefined),
})

export type InboxFilters = z.output<typeof inboxFiltersSchema>

/** Canned response, inserted into the reply box. */
export const savedReplySchema = z.object({
  title: z.string().trim().min(1, 'Give it a title').max(120),
  body: z.string().trim().min(1, 'Write the reply').max(20000),
})

export type SavedReplyInput = z.input<typeof savedReplySchema>

export const notificationPreferencesSchema = z.object({
  newThreads: z.enum(['all', 'none']),
  replies: z.enum(['all', 'assigned', 'none']),
  dailyDigest: z.boolean(),
})

export type NotificationPreferences = z.output<typeof notificationPreferencesSchema>

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newThreads: 'all',
  replies: 'assigned',
  dailyDigest: false,
}

/** A domain name the workspace sends from, e.g. example.com or mail.example.com. */
export const sendingDomainSchema = z.object({
  domain: z.string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, 'Enter a domain name such as example.com'),
  fromLocalPart: z.string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/, 'Enter the part before the @, such as support')
    .default('support'),
})

export type SendingDomainInput = z.input<typeof sendingDomainSchema>

/**
 * Replaces {{name}}, {{email}} and {{site}} style variables. Unknown variables
 * are left as is; empty values fall back to the text after `|`, as in
 * {{name|there}}.
 */
export function fillTemplate(template: string, variables: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{\s*([a-z][\w.]*)\s*(?:\|([^}]*))?\}\}/gi, (match, key: string, fallback: string | undefined) => {
    const lookup = Object.hasOwn(variables, key) ? variables[key] : undefined
    if (lookup) return lookup
    if (fallback !== undefined) return fallback.trim()
    return Object.hasOwn(variables, key) ? '' : match
  })
}
