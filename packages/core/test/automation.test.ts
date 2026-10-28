import { describe, expect, it } from 'vitest'

import {
  autoReplyFormSchema,
  DEFAULT_OPENING_HOURS,
  isWithinOpeningHours,
  matchesAutoReplyRule,
  openingHoursSchema,
  parseAutoReplyConditions,
  parseOpeningHours,
  planAutomation,
  type AutoReplyRule,
  type AutomationSubmission,
  type OpeningHours,
} from '../src'

const SITE = '33333333-3333-3333-3333-333333333333'
const WIDGET = '44444444-4444-4444-4444-000000000001'
const MEMBER = '11111111-1111-1111-1111-111111111111'

const hours: OpeningHours = { ...structuredClone(DEFAULT_OPENING_HOURS), enabled: true, timezone: 'Europe/Paris' }

describe('opening hours', () => {
  it('is always open when disabled', () => {
    expect(isWithinOpeningHours(DEFAULT_OPENING_HOURS, new Date('2026-11-01T03:00:00Z'))).toBe(true)
  })

  it('uses the time zone of the workspace', () => {
    // Wednesday 28 October 2026: Paris is UTC+1 (winter time from 25 October).
    expect(isWithinOpeningHours(hours, new Date('2026-10-28T08:30:00Z'))).toBe(true)
    expect(isWithinOpeningHours(hours, new Date('2026-10-28T07:30:00Z'))).toBe(false)
    expect(isWithinOpeningHours(hours, new Date('2026-10-28T16:59:00Z'))).toBe(true)
    expect(isWithinOpeningHours(hours, new Date('2026-10-28T17:00:00Z'))).toBe(false)
  })

  it('closes on disabled days', () => {
    // Saturday at noon in Paris.
    expect(isWithinOpeningHours(hours, new Date('2026-10-31T11:00:00Z'))).toBe(false)
    // Sunday 23:30 in UTC is already Monday 00:30 in Paris, still closed.
    expect(isWithinOpeningHours(hours, new Date('2026-11-01T23:30:00Z'))).toBe(false)
  })

  it('validates days and time zones', () => {
    expect(openingHoursSchema.safeParse({ ...hours, timezone: 'Mars/Olympus' }).success).toBe(false)
    expect(openingHoursSchema.safeParse({ ...hours, days: hours.days.slice(1) }).success).toBe(false)
    const days = hours.days.map(day => ({ ...day }))
    days[0] = { enabled: true, start: '18:00', end: '09:00' }
    expect(openingHoursSchema.safeParse({ ...hours, days }).success).toBe(false)
    days[0] = { enabled: false, start: '18:00', end: '09:00' }
    expect(openingHoursSchema.safeParse({ ...hours, days }).success).toBe(true)
  })

  it('falls back to disabled defaults for invalid stored values', () => {
    expect(parseOpeningHours({})).toEqual(DEFAULT_OPENING_HOURS)
    expect(parseOpeningHours(hours)).toEqual(hours)
  })
})

function rule(overrides: Partial<AutoReplyRule> = {}): AutoReplyRule {
  return { id: 'rule', siteId: null, trigger: 'new_thread', conditions: {}, sendEmail: true, labels: [], assigneeId: null, ...overrides }
}

const submission: AutomationSubmission = {
  siteId: SITE,
  widgetId: WIDGET,
  message: 'Hello, I would like a REFUND for my order',
  fields: [{ id: 'topic', label: 'Topic', value: 'Billing' }],
}

describe('matchesAutoReplyRule', () => {
  it('matches everything without conditions', () => {
    expect(matchesAutoReplyRule(rule(), submission)).toBe(true)
  })

  it('filters by site and form', () => {
    expect(matchesAutoReplyRule(rule({ siteId: SITE }), submission)).toBe(true)
    expect(matchesAutoReplyRule(rule({ siteId: MEMBER }), submission)).toBe(false)
    expect(matchesAutoReplyRule(rule({ conditions: { widgetIds: [WIDGET] } }), submission)).toBe(true)
    expect(matchesAutoReplyRule(rule({ conditions: { widgetIds: [MEMBER] } }), submission)).toBe(false)
    expect(matchesAutoReplyRule(rule({ conditions: { widgetIds: [WIDGET] } }), { ...submission, widgetId: null })).toBe(false)
  })

  it('matches keywords case-insensitively', () => {
    expect(matchesAutoReplyRule(rule({ conditions: { keywords: ['invoice', 'Refund'] } }), submission)).toBe(true)
    expect(matchesAutoReplyRule(rule({ conditions: { keywords: ['invoice'] } }), submission)).toBe(false)
  })

  it('matches custom field values', () => {
    expect(matchesAutoReplyRule(rule({ conditions: { field: { id: 'topic', value: 'billing' } } }), submission)).toBe(true)
    expect(matchesAutoReplyRule(rule({ conditions: { field: { id: 'topic', value: 'Sales' } } }), submission)).toBe(false)
    expect(matchesAutoReplyRule(rule({ conditions: { field: { id: 'plan', value: 'Billing' } } }), submission)).toBe(false)
  })

  it('never matches invalid stored conditions', () => {
    expect(parseAutoReplyConditions({ keywords: 'refund' })).toBeNull()
    expect(matchesAutoReplyRule(rule({ conditions: { keywords: 'refund' } }), submission)).toBe(false)
  })
})

describe('planAutomation', () => {
  const ack = rule({ id: 'ack' })
  const away = rule({ id: 'away', trigger: 'outside_hours' })
  const billing = rule({ id: 'billing', sendEmail: false, labels: ['billing'], assigneeId: MEMBER, conditions: { keywords: ['refund'] } })
  const sales = rule({ id: 'sales', sendEmail: false, labels: ['sales'], conditions: { keywords: ['quote'] } })

  it('sends the acknowledgement during opening hours', () => {
    const plan = planAutomation([ack, away, billing, sales], submission, { withinOpeningHours: true })
    expect(plan.email?.id).toBe('ack')
    expect(plan.labels).toEqual(['billing'])
    expect(plan.assigneeId).toBe(MEMBER)
  })

  it('prefers the out-of-office message outside opening hours', () => {
    expect(planAutomation([ack, away], submission, { withinOpeningHours: false }).email?.id).toBe('away')
    expect(planAutomation([away], submission, { withinOpeningHours: true }).email).toBeNull()
  })

  it('keeps the first matching email rule and merges labels', () => {
    const second = rule({ id: 'second', labels: ['billing', 'vip'] })
    const plan = planAutomation([billing, ack, second], submission, { withinOpeningHours: true })
    expect(plan.email?.id).toBe('ack')
    expect(plan.labels).toEqual(['billing', 'vip'])
  })
})

describe('autoReplyFormSchema', () => {
  it('requires a subject and a message to send an email', () => {
    const result = autoReplyFormSchema.safeParse({ name: 'Ack' })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map(issue => issue.path[0])).toEqual(['subject', 'body'])
  })

  it('requires at least one action', () => {
    expect(autoReplyFormSchema.safeParse({ name: 'Nothing', sendEmail: false }).success).toBe(false)
    const parsed = autoReplyFormSchema.parse({ name: 'Label', sendEmail: false, labels: [' Billing ', 'billing'] })
    expect(parsed.labels).toEqual(['billing'])
    expect(parsed.conditions).toEqual({ widgetIds: [], keywords: [], field: null })
  })

  it('normalizes keywords and limits the delay', () => {
    const parsed = autoReplyFormSchema.parse({ name: 'Ack', subject: 'Hi', body: 'Thanks', conditions: { keywords: [' Refund '] } })
    expect(parsed.conditions.keywords).toEqual(['refund'])
    expect(autoReplyFormSchema.safeParse({ name: 'Ack', subject: 'Hi', body: 'Thanks', delayMinutes: 20000 }).success).toBe(false)
  })
})
