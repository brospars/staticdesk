import { z } from 'zod'

import { antiSpamSchema, pageFields } from './public-api'
import { emojiSchema, type CommentsWidgetConfig } from './widget-config'

// Comments and reactions posted from the widgets (public API).

/** Authors can edit their comment for this long after posting. */
export const COMMENT_EDIT_WINDOW_MINUTES = 15

/** Top-level comments per page of results; their replies come along. */
export const COMMENTS_PAGE_SIZE = 30

/** Comments with more links than this wait for approval. */
export const MAX_COMMENT_LINKS = 2

/** Secret returned when posting, kept by the visitor to edit or delete their post. */
const authorTokenSchema = z.string().min(20).max(200)

export const commentBodySchema = z.string().trim().min(1, 'Write a comment').max(5000)

/** POST /api/v1/public/sites/:key/comments. An empty name posts anonymously. */
export const publicCommentRequestSchema = z.object({
  widgetId: z.guid().optional(),
  /** Comment replied to. Replies to a reply go to the same thread (two levels). */
  parentId: z.guid().optional(),
  name: z.string().trim().max(120).optional(),
  body: commentBodySchema,
  ...pageFields,
}).extend(antiSpamSchema.shape)

export type PublicCommentRequest = z.infer<typeof publicCommentRequestSchema>

/** PATCH /api/v1/public/sites/:key/comments/:id */
export const publicCommentEditSchema = z.object({
  token: authorTokenSchema,
  body: commentBodySchema,
})

export type PublicCommentEdit = z.infer<typeof publicCommentEditSchema>

/** DELETE /api/v1/public/sites/:key/comments/:id and /reactions/:id */
export const publicAuthorTokenSchema = z.object({ token: authorTokenSchema })

/** GET /api/v1/public/sites/:key/comments */
export const publicCommentsQuerySchema = z.object({
  pageId: pageFields.pageId,
  widgetId: z.guid().optional(),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})

/** A published comment, as shown to visitors. */
export interface PublicComment {
  id: string
  parentId: string | null
  /** Null for anonymous comments. */
  author: string | null
  body: string
  /** Deleted by its author; kept as a placeholder because it has replies. */
  deleted: boolean
  createdAt: string
  editedAt: string | null
  replies: PublicComment[]
}

export interface PublicCommentsResponse {
  comments: PublicComment[]
  /** Published comments on the page, replies included. */
  total: number
  nextOffset: number | null
}

/** Response of POST /comments and PATCH /comments/:id. */
export interface PublicCommentPosted {
  comment: PublicComment
  /** Pending comments are published once a moderator approves them. */
  status: 'approved' | 'pending'
  /** Only returned when posting. */
  token?: string
}

const LINK = /https?:\/\/|www\./gi

/** Banned words match whole words, case-insensitively. */
function containsBannedWord(body: string, bannedWords: readonly string[]): boolean {
  const words = new Set(body.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean))
  const text = body.toLowerCase()
  return bannedWords.some(word => /[^\p{L}\p{N}]/u.test(word) ? text.includes(word) : words.has(word))
}

/** Whether a comment waits for a moderator, per the widget's rules. */
export function commentNeedsApproval(config: Pick<CommentsWidgetConfig, 'moderation' | 'bannedWords'>, comment: { anonymous: boolean, body: string }): boolean {
  if (config.moderation === 'all') return true
  if (config.moderation === 'anonymous' && comment.anonymous) return true
  if ((comment.body.match(LINK)?.length ?? 0) > MAX_COMMENT_LINKS) return true
  return containsBannedWord(comment.body, config.bannedWords)
}

export const HELPFUL_KINDS = ['helpful', 'unhelpful'] as const

/** Reaction kinds: "helpful", "unhelpful" or "emoji:<emoji>". */
export const reactionKindSchema = z.union([
  z.enum(HELPFUL_KINDS),
  z.templateLiteral(['emoji:', z.string()]).refine(kind => emojiSchema.safeParse(kind.slice(6)).success, 'Invalid emoji'),
])

export type ReactionKind = z.infer<typeof reactionKindSchema>

/** POST /api/v1/public/sites/:key/reactions */
export const publicReactionRequestSchema = z.object({
  widgetId: z.guid().optional(),
  kind: reactionKindSchema,
  ...pageFields,
})

export type PublicReactionRequest = z.infer<typeof publicReactionRequestSchema>

/** PATCH /api/v1/public/sites/:key/reactions/:id: feedback after a "not helpful". */
export const publicReactionCommentSchema = z.object({
  token: authorTokenSchema,
  comment: z.string().trim().min(1).max(2000),
})

/** GET /api/v1/public/sites/:key/reactions */
export const publicReactionsQuerySchema = z.object({ pageId: pageFields.pageId })

/** Public counters of the emoji reactions of a page, keyed by kind ("emoji:🎉"). */
export interface PublicReactionCounts {
  counts: Record<string, number>
}

/** Response of POST /reactions. */
export interface PublicReactionPosted extends PublicReactionCounts {
  id: string
  /** Secret to remove the reaction or add a comment. */
  token: string
}
