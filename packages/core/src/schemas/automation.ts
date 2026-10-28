import { z } from 'zod'

import type { ContactFieldEntry } from './contact-form'
import { threadLabelsSchema } from './inbox'

// Opening hours -----------------------------------------------------------------------

/** Day names, Monday first, as in `OpeningHours.days`. */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  }
  catch {
    return false
  }
}

export const openingDaySchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(TIME, 'Use the HH:MM format'),
  end: z.string().regex(TIME, 'Use the HH:MM format'),
}).refine(day => !day.enabled || day.end > day.start, { message: 'Closing time must be after opening time', path: ['end'] })

export type OpeningDay = z.output<typeof openingDaySchema>

const WEEKDAY: OpeningDay = { enabled: true, start: '09:00', end: '18:00' }
const WEEKEND: OpeningDay = { enabled: false, start: '09:00', end: '18:00' }

export const DEFAULT_OPENING_HOURS = {
  enabled: false,
  timezone: 'UTC',
  days: [WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKEND, WEEKEND],
}

/** Opening hours of a workspace (`workspaces.opening_hours`). Days start on Monday. */
export const openingHoursSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
  days: z.array(openingDaySchema).length(7),
})

export type OpeningHours = z.output<typeof openingHoursSchema>

/** Reads stored opening hours, falling back to the defaults (disabled) when invalid. */
export function parseOpeningHours(value: unknown): OpeningHours {
  const parsed = openingHoursSchema.safeParse(value)
  return parsed.success ? parsed.data : structuredClone(DEFAULT_OPENING_HOURS)
}

/** Weekday (0 = Monday) and HH:MM time of a date in a time zone. */
function localTime(date: Date, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map(part => [part.type, part.value]))
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday!)
  return { day, time: `${parts.hour}:${parts.minute}` }
}

/** Whether the team is available at this date. Always true when opening hours are disabled. */
export function isWithinOpeningHours(hours: OpeningHours, date: Date = new Date()): boolean {
  if (!hours.enabled) return true
  const { day, time } = localTime(date, hours.timezone)
  const opening = hours.days[day]
  return Boolean(opening?.enabled && time >= opening.start && time < opening.end)
}

// Rules ---------------------------------------------------------------------------------

export const AUTO_REPLY_TRIGGERS = ['new_thread', 'outside_hours'] as const
export type AutoReplyTrigger = (typeof AUTO_REPLY_TRIGGERS)[number]

export const MAX_AUTO_REPLY_DELAY_MINUTES = 10080

/** Which submissions a rule applies to. Empty conditions match every new conversation. */
export const autoReplyConditionsSchema = z.object({
  /** Contact forms (widget ids); empty means every form. */
  widgetIds: z.array(z.guid()).max(50).default([]),
  /** Matches when the message contains any of these words (case-insensitive). */
  keywords: z.array(z.string().trim().toLowerCase().min(1).max(60)).max(20, 'Use at most 20 keywords').default([]),
  /** Matches when a custom field has this value (case-insensitive). */
  field: z.object({
    id: z.string().trim().min(1, 'Choose a field').max(40),
    value: z.string().trim().min(1, 'Enter a value').max(500),
  }).nullable().default(null),
})

export type AutoReplyConditions = z.output<typeof autoReplyConditionsSchema>

/** Reads stored conditions; invalid ones match nothing rather than everything. */
export function parseAutoReplyConditions(value: unknown): AutoReplyConditions | null {
  const parsed = autoReplyConditionsSchema.safeParse(value ?? {})
  return parsed.success ? parsed.data : null
}

/** Auto-reply rule form in the dashboard. */
export const autoReplyFormSchema = z.object({
  name: z.string().trim().min(1, 'Give the rule a name').max(120),
  enabled: z.boolean().default(true),
  trigger: z.enum(AUTO_REPLY_TRIGGERS).default('new_thread'),
  siteId: z.guid().nullable().default(null),
  conditions: autoReplyConditionsSchema.default({ widgetIds: [], keywords: [], field: null }),
  sendEmail: z.boolean().default(true),
  subject: z.string().trim().max(300).default(''),
  body: z.string().trim().max(20000).default(''),
  delayMinutes: z.number().int().min(0).max(MAX_AUTO_REPLY_DELAY_MINUTES, 'Use at most 7 days').default(0),
  labels: threadLabelsSchema.default([]),
  assigneeId: z.guid().nullable().default(null),
}).superRefine((rule, ctx) => {
  if (rule.sendEmail && !rule.subject) ctx.addIssue({ code: 'custom', message: 'Write a subject', path: ['subject'] })
  if (rule.sendEmail && !rule.body) ctx.addIssue({ code: 'custom', message: 'Write the message', path: ['body'] })
  if (!rule.sendEmail && !rule.labels.length && !rule.assigneeId) {
    ctx.addIssue({ code: 'custom', message: 'Send an email, add a label or assign someone', path: ['sendEmail'] })
  }
})

export type AutoReplyFormInput = z.input<typeof autoReplyFormSchema>
export type AutoReplyForm = z.output<typeof autoReplyFormSchema>

/** Reminder for unanswered conversations, in hours (null disables it). */
export const followUpHoursSchema = z.number().int().min(1, 'Use at least 1 hour').max(720, 'Use at most 30 days').nullable()

/** A stored rule, as the server evaluates it. */
export interface AutoReplyRule {
  id: string
  siteId: string | null
  trigger: AutoReplyTrigger
  conditions: unknown
  sendEmail: boolean
  labels: string[]
  assigneeId: string | null
}

/** What a new conversation is matched against. */
export interface AutomationSubmission {
  siteId: string
  widgetId: string | null
  message: string
  fields: readonly ContactFieldEntry[]
}

/** Whether a rule applies to a submission, ignoring the opening hours. */
export function matchesAutoReplyRule(rule: AutoReplyRule, submission: AutomationSubmission): boolean {
  if (rule.siteId && rule.siteId !== submission.siteId) return false
  const conditions = parseAutoReplyConditions(rule.conditions)
  if (!conditions) return false

  if (conditions.widgetIds.length && !(submission.widgetId && conditions.widgetIds.includes(submission.widgetId))) return false

  if (conditions.keywords.length) {
    const message = submission.message.toLowerCase()
    if (!conditions.keywords.some(keyword => message.includes(keyword))) return false
  }

  if (conditions.field) {
    const { id, value } = conditions.field
    const entry = submission.fields.find(candidate => candidate.id === id)
    if (!entry || entry.value.trim().toLowerCase() !== value.toLowerCase()) return false
  }
  return true
}

export interface AutomationPlan<Rule extends AutoReplyRule = AutoReplyRule> {
  /** Rule whose email is sent, if any. */
  email: Rule | null
  /** Labels to add to the conversation. */
  labels: string[]
  /** Member to assign when the conversation has no assignee. */
  assigneeId: string | null
}

/**
 * Applies the rules (in order) to a new conversation. Every matching rule adds
 * its labels; the first one with an assignee assigns. One email at most is
 * sent: outside opening hours, out-of-office rules win over acknowledgements.
 */
export function planAutomation<Rule extends AutoReplyRule>(
  rules: readonly Rule[],
  submission: AutomationSubmission,
  options: { withinOpeningHours: boolean },
): AutomationPlan<Rule> {
  const matching = rules.filter(rule =>
    (rule.trigger === 'new_thread' || !options.withinOpeningHours) && matchesAutoReplyRule(rule, submission))

  const senders = matching.filter(rule => rule.sendEmail)
  const email = senders.find(rule => rule.trigger === 'outside_hours') ?? senders[0] ?? null

  return {
    email,
    labels: [...new Set(matching.flatMap(rule => rule.labels))],
    assigneeId: matching.find(rule => rule.assigneeId)?.assigneeId ?? null,
  }
}
