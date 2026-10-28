import { CRON_JOBS, isCronDue } from '../../shared/cron-jobs'

/**
 * Built-in scheduler for servers without an external cron (Docker, a single
 * Node process): with NUXT_SCHEDULER=internal, calls the /api/cron/* jobs on
 * their schedule. Enable it on one instance only.
 */
export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  if (config.scheduler !== 'internal') return
  if (!config.cronSecret) {
    console.error('[scheduler] NUXT_CRON_SECRET is required with NUXT_SCHEDULER=internal: scheduled jobs are off')
    return
  }

  const run = async (path: string) => {
    try {
      const response = await nitroApp.localFetch(path, { headers: { authorization: `Bearer ${config.cronSecret}` } })
      if (!response.ok) console.error(`[scheduler] ${path} answered ${response.status}`)
    }
    catch (error) {
      console.error(`[scheduler] ${path} failed`, error)
    }
  }

  const tick = () => {
    const now = new Date()
    for (const job of CRON_JOBS) {
      if (isCronDue(job.schedule, now)) void run(job.path)
    }
  }

  // Align the checks on the start of each minute.
  let interval: ReturnType<typeof setInterval> | undefined
  const timeout = setTimeout(() => {
    tick()
    interval = setInterval(tick, 60_000)
  }, 60_000 - (Date.now() % 60_000))

  nitroApp.hooks.hook('close', () => {
    clearTimeout(timeout)
    clearInterval(interval)
  })
  console.info(`[scheduler] running ${CRON_JOBS.length} scheduled jobs`)
})
