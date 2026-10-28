import { describe, expect, it } from 'vitest'

import { isAllowedWebhookUrl, webhookFormSchema } from '../src'

describe('isAllowedWebhookUrl', () => {
  it('accepts public HTTPS URLs', () => {
    expect(isAllowedWebhookUrl('https://hooks.example.com/staticdesk')).toBe(true)
  })

  it('rejects HTTP, credentials and internal hosts', () => {
    for (const url of [
      'http://hooks.example.com',
      'https://user:pass@hooks.example.com',
      'https://localhost/hook',
      'https://127.0.0.1/hook',
      'https://10.0.0.8/hook',
      'https://192.168.1.10/hook',
      'https://172.20.0.1/hook',
      'https://169.254.169.254/latest',
      'https://[::1]/hook',
      'https://printer.local/hook',
      'not a url',
    ]) {
      expect(isAllowedWebhookUrl(url), url).toBe(false)
    }
  })
})

describe('webhookFormSchema', () => {
  it('checks the host of Slack and Discord webhooks', () => {
    expect(webhookFormSchema.safeParse({ kind: 'slack', url: 'https://hooks.slack.com/services/T/B/X' }).success).toBe(true)
    expect(webhookFormSchema.safeParse({ kind: 'slack', url: 'https://example.com/hook' }).success).toBe(false)
    expect(webhookFormSchema.safeParse({ kind: 'discord', url: 'https://discord.com/api/webhooks/1/x' }).success).toBe(true)
    expect(webhookFormSchema.safeParse({ kind: 'custom', url: 'https://example.com/hook' }).success).toBe(true)
  })
})
