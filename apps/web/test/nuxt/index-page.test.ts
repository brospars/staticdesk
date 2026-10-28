import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import IndexPage from '~/pages/index.vue'

describe('index page', () => {
  it('renders the product name', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.find('h1').text()).toBe('StaticDesk')
  })
})
