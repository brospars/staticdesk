import { parseContactWidgetConfig, type PublicSiteConfig } from '@staticdesk/core'

// Notification settings stay private.
function publicContactConfig(value: unknown) {
  const { notifyTeam: _, ...config } = parseContactWidgetConfig(value)
  return config
}

// Configuration the widget needs to render: language, theme and enabled widgets.
export default defineEventHandler((event): PublicSiteConfig => {
  const site = usePublicSite(event)
  const config = useRuntimeConfig(event)
  const turnstileReady = Boolean(config.public.turnstileSiteKey && config.turnstileSecretKey)

  setResponseHeader(event, 'Cache-Control', 'public, max-age=60')

  return {
    site: { name: site.name },
    locale: site.settings.locale,
    theme: site.settings.theme,
    turnstileSiteKey: site.settings.turnstile && turnstileReady ? String(config.public.turnstileSiteKey) : null,
    widgets: site.widgets.map(widget => ({
      id: widget.id,
      kind: widget.kind,
      config: widget.kind === 'contact' ? publicContactConfig(widget.config) : {},
    })),
  }
})
