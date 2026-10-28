import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  ATTACHMENT_LIMITS,
  ATTACHMENTS_BUCKET,
  isAllowedAttachmentType,
  safeFileName,
  type AttachmentSummary,
  type AttachmentUploadResponse,
} from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

import type { PublicSite } from '../public/site'

/** A file posted with a plain HTML form. */
export interface AttachmentFile {
  name: string
  type: string
  data: Buffer
}

/** Storage path of an attachment: workspace, site, attachment id, then the cleaned file name. */
export function attachmentPath(site: Pick<PublicSite, 'id' | 'workspaceId'>, id: string, name: string): string {
  return `${site.workspaceId}/${site.id}/${id}/${safeFileName(name)}`
}

async function insertAttachment(event: H3Event, site: PublicSite, file: { name: string, type: string, size: number }) {
  const id = randomUUID()
  const path = attachmentPath(site, id, file.name)
  const { error } = await serverSupabaseServiceRole(event).from('attachments').insert({
    id,
    workspace_id: site.workspaceId,
    site_id: site.id,
    storage_path: path,
    file_name: file.name.slice(0, 255),
    content_type: file.type,
    size_bytes: file.size,
  })
  if (error) {
    console.error('[attachments] insert failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not prepare the upload' })
  }
  return { id, path }
}

/**
 * Registers an upload and returns a signed URL the widget PUTs the file to.
 * The file is linked to a message when the submission references its id.
 */
export async function createAttachmentUpload(
  event: H3Event,
  site: PublicSite,
  file: { name: string, type: string, size: number },
): Promise<AttachmentUploadResponse> {
  const { id, path } = await insertAttachment(event, site, file)
  const { data, error } = await serverSupabaseServiceRole(event).storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(path)
  if (error) {
    console.error('[attachments] signed upload URL failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not prepare the upload' })
  }
  return { id, uploadUrl: data.signedUrl }
}

/** Problems with files posted by a plain HTML form (next to `uploaded` other attachments), as messages for the visitor. */
export function checkAttachmentFiles(files: AttachmentFile[], uploaded = 0): string[] {
  const errors: string[] = []
  if (files.length + uploaded > ATTACHMENT_LIMITS.maxFiles) errors.push(`Attach at most ${ATTACHMENT_LIMITS.maxFiles} files`)
  for (const file of files) {
    if (!isAllowedAttachmentType(file.type)) errors.push(`${file.name}: this file type is not accepted`)
    else if (file.data.length > ATTACHMENT_LIMITS.maxBytes) errors.push(`${file.name}: this file is too large`)
  }
  return errors
}

/** Uploads files posted by a plain HTML form (already checked) and returns their attachment ids. */
export async function storeAttachmentFiles(event: H3Event, site: PublicSite, files: AttachmentFile[]): Promise<string[]> {
  return Promise.all(files.map(async (file) => {
    const { id, path } = await insertAttachment(event, site, { name: file.name, type: file.type, size: file.data.length })
    const { error } = await serverSupabaseServiceRole(event).storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, file.data, { contentType: file.type })
    if (error) {
      console.error('[attachments] upload failed', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Could not store the attachments' })
    }
    return id
  }))
}

/** Names, sizes and types of linked attachments, for emails and webhooks. */
export async function describeAttachments(event: H3Event, ids: string[]): Promise<AttachmentSummary[]> {
  if (!ids.length) return []
  const { data, error } = await serverSupabaseServiceRole(event)
    .from('attachments')
    .select('file_name, size_bytes, content_type')
    .in('id', ids)
    .order('created_at')
  if (error) {
    console.error('[attachments] could not read the attachments', error.message)
    return []
  }
  return data.map(row => ({ name: row.file_name, size: row.size_bytes, contentType: row.content_type }))
}

/**
 * Deletes attachments that are not linked to a message a day after their upload:
 * abandoned uploads, and files of deleted conversations. Returns how many were removed.
 */
export async function deleteUnlinkedAttachments(event: H3Event, batchSize = 500): Promise<number> {
  const supabase = serverSupabaseServiceRole(event)
  const before = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('attachments')
    .select('id, storage_path')
    .is('message_id', null)
    .lt('created_at', before)
    .limit(batchSize)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data.length) return 0

  // Missing files (never uploaded) are not an error for remove().
  const removed = await supabase.storage.from(ATTACHMENTS_BUCKET).remove(data.map(row => row.storage_path))
  if (removed.error) throw createError({ statusCode: 500, statusMessage: removed.error.message })

  const deleted = await supabase.from('attachments').delete().in('id', data.map(row => row.id))
  if (deleted.error) throw createError({ statusCode: 500, statusMessage: deleted.error.message })
  return data.length
}
