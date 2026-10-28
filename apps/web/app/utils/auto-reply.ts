import type { AutoReplyTrigger } from '@staticdesk/core'

/** An auto-reply rule as the dashboard reads it. */
export interface StoredAutoReply {
  id: string
  name: string
  enabled: boolean
  trigger: AutoReplyTrigger
  site_id: string | null
  conditions: unknown
  send_email: boolean
  subject: string | null
  body: string | null
  delay_minutes: number
  add_labels: string[]
  assignee_id: string | null
}

/** A site and its widgets, to pick the forms and fields a rule applies to. */
export interface RuleSite {
  id: string
  name: string
  widgets: { id: string, name: string, kind: string, config: unknown }[]
}

/** Whether a message's metadata marks it as an auto-reply. */
export function isAutoReply(metadata: unknown): boolean {
  return Boolean(metadata && typeof metadata === 'object' && !Array.isArray(metadata) && 'autoReply' in metadata)
}
