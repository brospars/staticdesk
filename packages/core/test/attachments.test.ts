import { describe, expect, it } from 'vitest'

import {
  ATTACHMENT_LIMITS,
  attachmentUploadRequestSchema,
  formatFileSize,
  parseContactWidgetConfig,
  publicAttachmentLimits,
  safeFileName,
} from '../src'

describe('safeFileName', () => {
  it('drops directories and unsafe characters', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('C:\\Users\\ada\\Résumé (final).pdf')).toBe('Resume _final_.pdf')
    expect(safeFileName('a"b<c>.png')).toBe('a_b_c_.png')
    expect(safeFileName('.htaccess')).toBe('htaccess')
    expect(safeFileName('///')).toBe('file')
  })

  it('shortens long names but keeps the extension', () => {
    const name = safeFileName(`${'x'.repeat(300)}.docx`)
    expect(name).toHaveLength(100)
    expect(name.endsWith('.docx')).toBe(true)
  })
})

describe('attachmentUploadRequestSchema', () => {
  const valid = { name: 'shot.png', type: 'image/png', size: 1200 }

  it('accepts allowed files within the size limit', () => {
    expect(attachmentUploadRequestSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects other types, empty and oversized files', () => {
    expect(attachmentUploadRequestSchema.safeParse({ ...valid, type: 'text/html' }).success).toBe(false)
    expect(attachmentUploadRequestSchema.safeParse({ ...valid, type: 'image/svg+xml' }).success).toBe(false)
    expect(attachmentUploadRequestSchema.safeParse({ ...valid, size: 0 }).success).toBe(false)
    expect(attachmentUploadRequestSchema.safeParse({ ...valid, size: ATTACHMENT_LIMITS.maxBytes + 1 }).success).toBe(false)
  })
})

describe('attachments configuration', () => {
  it('is off unless enabled on the form', () => {
    expect(parseContactWidgetConfig({}).attachments).toBe(false)
    expect(parseContactWidgetConfig({ attachments: true }).attachments).toBe(true)
  })

  it('tells the widget which files to accept', () => {
    expect(publicAttachmentLimits.accept.split(',')).toEqual(expect.arrayContaining(['application/pdf', '.pdf', 'image/png']))
  })
})

describe('formatFileSize', () => {
  it('uses B, kB and MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(34_000)).toBe('34 kB')
    expect(formatFileSize(3_400_000)).toBe('3.4 MB')
  })
})
