import { describe, expect, it } from 'vitest'

import {
  buildHtmlFormSnippet,
  contactFieldSchema,
  contactFieldsSchema,
  contactFieldValuesSchema,
  contactWidgetFormSchema,
  describeFieldValues,
  parseContactWidgetConfig,
  type ContactField,
} from '../src'

const fields: ContactField[] = [
  contactFieldSchema.parse({ id: 'company', type: 'text', label: 'Company', required: true }),
  contactFieldSchema.parse({ id: 'topic', type: 'select', label: 'Topic', options: ['Sales', 'Support'] }),
  contactFieldSchema.parse({ id: 'consent', type: 'checkbox', label: 'I agree', required: true }),
  contactFieldSchema.parse({ id: 'newsletter', type: 'checkbox', label: 'Newsletter' }),
]

describe('contactFieldSchema', () => {
  it('rejects reserved and invalid ids', () => {
    expect(contactFieldSchema.safeParse({ id: 'email', type: 'text', label: 'Email' }).success).toBe(false)
    expect(contactFieldSchema.safeParse({ id: '_redirect', type: 'text', label: 'X' }).success).toBe(false)
    expect(contactFieldSchema.safeParse({ id: 'Company', type: 'text', label: 'X' }).success).toBe(false)
  })

  it('requires options for select fields', () => {
    expect(contactFieldSchema.safeParse({ id: 'topic', type: 'select', label: 'Topic' }).success).toBe(false)
  })

  it('requires unique ids in a form', () => {
    const field = { id: 'company', type: 'text', label: 'Company' }
    expect(contactFieldsSchema.safeParse([field, field]).success).toBe(false)
  })
})

describe('contactFieldValuesSchema', () => {
  const schema = contactFieldValuesSchema(fields)

  it('accepts valid values, trims text and drops unknown keys', () => {
    expect(schema.parse({ company: ' Acme ', topic: 'Sales', consent: true, extra: 'x' }))
      .toEqual({ company: 'Acme', topic: 'Sales', consent: true })
  })

  it('accepts checkbox values posted by HTML forms', () => {
    expect(schema.parse({ company: 'Acme', consent: 'on', newsletter: 'on' }))
      .toEqual({ company: 'Acme', consent: true, newsletter: true })
  })

  it('reports missing required values and invalid choices per field', () => {
    const result = schema.safeParse({ company: '  ', topic: 'Other', consent: false })
    expect(result.success).toBe(false)
    const paths = result.error!.issues.map(issue => issue.path[0])
    expect(paths).toEqual(expect.arrayContaining(['company', 'topic', 'consent']))
  })

  it('treats empty optional values as missing', () => {
    expect(schema.parse({ company: 'Acme', topic: '', consent: true })).toEqual({ company: 'Acme', consent: true })
  })
})

describe('describeFieldValues', () => {
  it('lists values with their labels in the form order', () => {
    expect(describeFieldValues(fields, { consent: true, company: 'Acme' })).toEqual([
      { id: 'company', label: 'Company', value: 'Acme' },
      { id: 'consent', label: 'I agree', value: 'Yes' },
    ])
  })
})

describe('parseContactWidgetConfig', () => {
  it('fills in defaults', () => {
    expect(parseContactWidgetConfig(null)).toMatchObject({
      nameField: 'optional',
      fields: [],
      notifyTeam: true,
      redirectUrl: null,
      errorMessage: null,
    })
  })

  it('keeps valid fields and drops invalid or duplicate ones', () => {
    const config = parseContactWidgetConfig({
      fields: [
        { id: 'company', type: 'text', label: 'Company' },
        { id: 'company', type: 'text', label: 'Again' },
        { id: 'email', type: 'text', label: 'Reserved' },
        'garbage',
      ],
      redirectUrl: 'javascript:alert(1)',
    })
    expect(config.fields.map(field => field.label)).toEqual(['Company'])
    expect(config.redirectUrl).toBeNull()
  })
})

describe('contactWidgetFormSchema', () => {
  it('stores empty texts and redirect as null', () => {
    const result = contactWidgetFormSchema.parse({
      name: 'Contact',
      title: ' ',
      description: '',
      buttonLabel: 'Write to us',
      successMessage: '',
      errorMessage: '',
      redirectUrl: '',
      position: 'bottom-right',
      nameField: 'required',
      fields: [],
      notifyTeam: false,
    })
    expect(result).toMatchObject({ title: null, buttonLabel: 'Write to us', redirectUrl: null })
  })
})

describe('buildHtmlFormSnippet', () => {
  it('writes a form with the built-in, custom and honeypot fields', () => {
    const html = buildHtmlFormSnippet({
      actionUrl: 'https://staticdesk.app/f/abc',
      nameField: 'hidden',
      fields: [...fields, contactFieldSchema.parse({ id: 'note', type: 'text', label: '<b>Note</b>', placeholder: 'a "quote"' })],
    })
    expect(html).toContain('<form action="https://staticdesk.app/f/abc" method="POST">')
    expect(html).not.toContain('name="name"')
    expect(html).toContain('<input name="company" required>')
    expect(html).toContain('<option>Support</option>')
    expect(html).toContain('<input name="consent" type="checkbox" required>')
    expect(html).toContain('&lt;b&gt;Note&lt;/b&gt;')
    expect(html).toContain('placeholder="a &quot;quote&quot;"')
    expect(html).toContain('name="_honeypot"')
  })
})
