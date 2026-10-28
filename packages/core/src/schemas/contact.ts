import { z } from 'zod'

import { contactFieldValuesInputSchema } from './contact-form'

/** Payload sent by the contact widget. Shared by the widget and the API. */
export const contactSubmissionSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.email().trim().max(320),
  message: z.string().trim().min(1).max(5000),
  /** Values of the form's custom fields, keyed by field id. */
  fields: contactFieldValuesInputSchema.optional(),
})

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>
