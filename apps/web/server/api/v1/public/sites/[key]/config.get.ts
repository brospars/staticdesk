import {
  parseCommentsWidgetConfig,
  parseContactWidgetConfig,
  parseReactionsWidgetConfig,
  publicAttachmentLimits,
  type PublicSiteConfig,
  type WidgetKind,
} from '@staticdesk/core'

// Notification and moderation settings stay private.
function publicWidgetConfig(kind: WidgetKind, value: unknown): Record<string, unknown> {
  if (kind === 'contact') {
    const { notifyTeam: _, ...config } = parseContactWidgetConfig(value)
    return config
  }
  if (kind === 'comments') {
    const { title, allowAnonymous, sort } = parseCommentsWidgetConfig(value)
    return { title, allowAnonymous, sort }
  }
  if (kind === 'reactions') return parseReactionsWidgetConfig(value)
  return {}
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
    attachments: publicAttachmentLimits,
    widgets: site.widgets.map(widget => ({
      id: widget.id,
      kind: widget.kind,
      config: publicWidgetConfig(widget.kind, widget.config),
    })),
  }
})
