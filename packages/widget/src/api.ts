import type { PublicContactRequest, PublicEvent, PublicSiteConfig } from '@staticdesk/core'

import type { StaticDeskConfig } from './config'

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export interface Api {
  config(): Promise<PublicSiteConfig>
  track(event: PublicEvent): void
  submitContact(payload: PublicContactRequest): Promise<void>
}

async function fail(response: Response): Promise<never> {
  let message = response.statusText
  try {
    message = ((await response.json()) as { statusMessage?: string }).statusMessage ?? message
  }
  catch {
    // Not JSON: keep the status text.
  }
  throw new ApiError(response.status, message)
}

export function createApi({ siteKey, apiBase }: StaticDeskConfig): Api {
  const base = `${apiBase}/api/v1/public/sites/${encodeURIComponent(siteKey)}`
  let config: Promise<PublicSiteConfig> | undefined

  return {
    config() {
      config ??= fetch(`${base}/config`)
        .then(response => response.ok ? response.json() as Promise<PublicSiteConfig> : fail(response))
        .catch((error: unknown) => {
          config = undefined // Retry on the next call.
          throw error
        })
      return config
    },

    track(event) {
      // A string body is sent as text/plain: no CORS preflight, survives page unloads.
      const body = JSON.stringify(event)
      if (navigator.sendBeacon?.(`${base}/events`, body)) return
      fetch(`${base}/events`, { method: 'POST', body, keepalive: true }).catch(() => {})
    },

    async submitContact(payload) {
      const response = await fetch(`${base}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) await fail(response)
    },
  }
}
