import { describe, expect, it } from 'vitest'

import { contactSubmissionSchema } from '../src'

describe('contactSubmissionSchema', () => {
  it('accepts a valid submission and trims fields', () => {
    const result = contactSubmissionSchema.parse({
      name: '  Ada ',
      email: 'ada@example.com',
      message: ' Hello ',
    })
    expect(result).toEqual({ name: 'Ada', email: 'ada@example.com', message: 'Hello' })
  })

  it('rejects an invalid email', () => {
    expect(contactSubmissionSchema.safeParse({ email: 'nope', message: 'Hi' }).success).toBe(false)
  })

  it('rejects an empty message', () => {
    expect(contactSubmissionSchema.safeParse({ email: 'ada@example.com', message: '   ' }).success).toBe(false)
  })
})
