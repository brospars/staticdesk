import { z } from 'zod'

import { SLUG_PATTERN } from '../utils/slug'

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  slug: z.string().trim().regex(SLUG_PATTERN, 'Use lowercase letters, numbers and dashes'),
})

export type WorkspaceInput = z.infer<typeof workspaceSchema>
