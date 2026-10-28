import type { H3Event } from 'h3'
import { z } from 'zod'
import {
  parseCommentsWidgetConfig,
  parseReactionsWidgetConfig,
  type CommentsWidgetConfig,
  type PublicComment,
  type ReactionKind,
  type ReactionsWidgetConfig,
} from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

import type { PublicSite } from '../public/site'

/** The enabled comments widget a request is for: the given id, else the site's first one. */
export function resolveCommentsWidget(site: PublicSite, widgetId?: string): { id: string, config: CommentsWidgetConfig } | null {
  const widgets = site.widgets.filter(widget => widget.kind === 'comments')
  const widget = widgets.find(candidate => candidate.id === widgetId) ?? widgets[0]
  return widget ? { id: widget.id, config: parseCommentsWidgetConfig(widget.config) } : null
}

export function requireCommentsWidget(site: PublicSite, widgetId?: string) {
  const widget = resolveCommentsWidget(site, widgetId)
  if (!widget) throw createError({ statusCode: 404, statusMessage: 'Comments are not enabled on this site' })
  return widget
}

/** Whether an enabled reactions widget of the site (or the given one) offers this kind. */
export function isReactionAllowed(site: PublicSite, kind: ReactionKind, widgetId?: string): boolean {
  const configs: ReactionsWidgetConfig[] = site.widgets
    .filter(widget => widget.kind === 'reactions' && (!widgetId || widget.id === widgetId))
    .map(widget => parseReactionsWidgetConfig(widget.config))
  return configs.some(config => kind === 'helpful' || kind === 'unhelpful'
    ? config.helpful
    : config.emojis.includes(kind.slice('emoji:'.length)))
}

export const COMMENT_COLUMNS = 'id, parent_id, is_anonymous, author_name, body, deleted_at, created_at, edited_at'

export interface CommentRow {
  id: string
  parent_id: string | null
  is_anonymous: boolean
  author_name: string | null
  body: string
  deleted_at: string | null
  created_at: string
  edited_at: string | null
}

export function toPublicComment(row: CommentRow, replies: PublicComment[] = []): PublicComment {
  return {
    id: row.id,
    parentId: row.parent_id,
    author: row.is_anonymous ? null : row.author_name,
    body: row.body,
    deleted: row.deleted_at !== null,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    replies,
  }
}

/** Parses the :id route parameter as a database id. */
export function routeId(event: H3Event): string {
  const parsed = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return parsed.data
}

/** Reads and validates a JSON body, answering 400 with the errors per field. */
export async function readValidated<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.output<T>> {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request', data: z.flattenError(parsed.error).fieldErrors })
  }
  return parsed.data
}

/** A comment of the site whose author holds the token; 404 or 403 otherwise. */
export async function findOwnComment(event: H3Event, siteId: string, id: string, token: string) {
  const { data, error } = await serverSupabaseServiceRole(event)
    .from('comments')
    .select('id, widget_id, is_anonymous, status, created_at, deleted_at, edit_token_hash')
    .eq('id', id)
    .eq('site_id', siteId)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not load the comment' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  if (!tokenMatches(token, data.edit_token_hash)) throw createError({ statusCode: 403, statusMessage: 'Invalid token' })
  return data
}
