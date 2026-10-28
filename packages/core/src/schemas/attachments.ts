import { z } from 'zod'

/** Storage bucket holding contact form attachments (private). */
export const ATTACHMENTS_BUCKET = 'attachments'

/** File types visitors may attach. No HTML, SVG or executables. */
export const ATTACHMENT_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
}

/** Limits per contact submission. The bucket enforces the same size and types. */
export const ATTACHMENT_LIMITS = {
  maxFiles: 3,
  maxBytes: 5 * 1024 * 1024,
} as const

/** Limits sent to the widget, which only imports types from this package. */
export interface PublicAttachmentLimits {
  maxFiles: number
  maxBytes: number
  /** Value of the file input's accept attribute. */
  accept: string
}

export const publicAttachmentLimits: PublicAttachmentLimits = {
  ...ATTACHMENT_LIMITS,
  accept: [...Object.keys(ATTACHMENT_TYPES), ...Object.values(ATTACHMENT_TYPES)].join(','),
}

export function isAllowedAttachmentType(type: string): boolean {
  return Object.hasOwn(ATTACHMENT_TYPES, type)
}

/**
 * File name safe to use in a storage path and a Content-Disposition header:
 * no directories, control or reserved characters, at most 100 characters,
 * keeping the extension.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? ''
  const cleaned = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim()
  if (!cleaned) return 'file'
  if (cleaned.length <= 100) return cleaned
  const dot = cleaned.lastIndexOf('.')
  const extension = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : ''
  return cleaned.slice(0, 100 - extension.length) + extension
}

/** POST /api/v1/public/sites/:key/attachments: asks for an upload URL before the submission. */
export const attachmentUploadRequestSchema = z.object({
  widgetId: z.guid().optional(),
  name: z.string().trim().min(1).max(255),
  type: z.string().refine(isAllowedAttachmentType, 'This file type is not accepted'),
  size: z.number().int().positive().max(ATTACHMENT_LIMITS.maxBytes, 'This file is too large'),
})

export type AttachmentUploadRequest = z.infer<typeof attachmentUploadRequestSchema>

/** Response: the widget PUTs the file to uploadUrl, then sends the id with the submission. */
export interface AttachmentUploadResponse {
  id: string
  uploadUrl: string
}

/** Attachment ids sent with a contact submission. */
export const attachmentIdsSchema = z.array(z.guid()).max(ATTACHMENT_LIMITS.maxFiles)

/** An attachment as described in webhooks and emails. */
export interface AttachmentSummary {
  name: string
  size: number
  contentType: string
}

/** Human readable file size: 512 B, 12 kB, 3.4 MB. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}
