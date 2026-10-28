import { describe, expect, it, vi } from 'vitest'

import { CRON_JOBS, isCronDue } from '../../shared/cron-jobs'
import { rewriteFetch } from '../../server/utils/rewrite-fetch'

describe('isCronDue', () => {
  const at = (time: string) => new Date(`2026-11-02T${time}:00Z`)

  it('matches minutes, hours and steps in UTC', () => {
    expect(isCronDue('0 7 * * *', at('07:00'))).toBe(true)
    expect(isCronDue('0 7 * * *', at('07:01'))).toBe(false)
    expect(isCronDue('0 7 * * *', at('08:00'))).toBe(false)
    expect(isCronDue('*/5 * * * *', at('13:35'))).toBe(true)
    expect(isCronDue('*/5 * * * *', at('13:36'))).toBe(false)
  })

  it('accepts every declared job and rejects unsupported schedules', () => {
    for (const job of CRON_JOBS) expect(() => isCronDue(job.schedule, at('00:00'))).not.toThrow()
    expect(() => isCronDue('0 7 * * 1', at('07:00'))).toThrow(/Unsupported/)
    expect(() => isCronDue('0-5 * * * *', at('07:00'))).not.toThrow()
    expect(isCronDue('0-5 * * * *', at('07:00'))).toBe(false)
  })
})

describe('rewriteFetch', () => {
  it('sends requests for the public Supabase URL to the internal one', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'))
    const rewritten = rewriteFetch(fetcher, 'https://desk.example.com', 'http://gateway:8000')

    await rewritten('https://desk.example.com/rest/v1/sites?select=id', { method: 'GET' })
    expect(fetcher).toHaveBeenLastCalledWith('http://gateway:8000/rest/v1/sites?select=id', { method: 'GET' })

    await rewritten(new URL('https://desk.example.com/auth/v1/user'))
    expect(fetcher).toHaveBeenLastCalledWith('http://gateway:8000/auth/v1/user', undefined)

    await rewritten(new Request('https://desk.example.com/storage/v1/object/x', { method: 'DELETE' }))
    const request = fetcher.mock.lastCall![0] as Request
    expect(request.url).toBe('http://gateway:8000/storage/v1/object/x')
    expect(request.method).toBe('DELETE')
  })

  it('leaves other URLs alone', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'))
    const rewritten = rewriteFetch(fetcher, 'https://desk.example.com', 'http://gateway:8000')
    await rewritten('https://desk.example.com.evil.dev/rest/v1')
    await rewritten('https://api.resend.com/emails')
    expect(fetcher.mock.calls.map(([input]) => input)).toEqual(['https://desk.example.com.evil.dev/rest/v1', 'https://api.resend.com/emails'])
  })
})
