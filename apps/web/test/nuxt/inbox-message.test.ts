import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import InboxMessage from '~/components/inbox/Message.vue'

const base = { created_at: '2026-10-28T10:00:00Z' }

describe('InboxMessage', () => {
  it('renders the body as text, with the form fields and page', async () => {
    const wrapper = await mountSuspended(InboxMessage, {
      props: {
        author: 'Ada Lovelace',
        message: {
          ...base,
          direction: 'inbound',
          body: '<img src=x onerror=alert(1)> Hello',
          metadata: { fields: [{ label: 'Topic', value: 'Bug report' }], pageUrl: 'https://docs.example.com/install' },
        },
      },
    })
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)> Hello')
    expect(wrapper.text()).toContain('Bug report')
    expect(wrapper.find('a[href="https://docs.example.com/install"]').exists()).toBe(true)
  })

  it('labels internal notes', async () => {
    const wrapper = await mountSuspended(InboxMessage, {
      props: { author: 'You', message: { ...base, direction: 'note', body: 'Check the logs', metadata: {} } },
    })
    expect(wrapper.text()).toContain('Internal note')
  })

  it('flags email replies sent from another address', async () => {
    const wrapper = await mountSuspended(InboxMessage, {
      props: {
        author: 'Ada',
        contactEmail: 'ada@example.com',
        message: { ...base, direction: 'inbound', body: 'Thanks', metadata: { source: 'email', from: 'ada@work.example.com' } },
      },
    })
    expect(wrapper.text()).toContain('Sent from ada@work.example.com')
  })
})
