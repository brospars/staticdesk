import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max).nullable().catch(null)

/** Configuration of a contact widget (widgets.config). Null texts use the translated defaults. */
export const contactWidgetConfigSchema = z.object({
  title: text(120),
  description: text(500),
  buttonLabel: text(40),
  successMessage: text(500),
  position: z.enum(['bottom-right', 'bottom-left']).catch('bottom-right'),
})

export type ContactWidgetConfig = z.output<typeof contactWidgetConfigSchema>

export function parseContactWidgetConfig(value: unknown): ContactWidgetConfig {
  return contactWidgetConfigSchema.parse(typeof value === 'object' && value !== null ? value : {})
}
