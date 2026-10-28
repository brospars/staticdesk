import { vi } from 'vitest'

import type { Api } from '../src/api'

/** An Api whose methods are all mocks. */
export function mockApi() {
  return {
    config: vi.fn<Api['config']>(),
    track: vi.fn<Api['track']>(),
    submitContact: vi.fn<Api['submitContact']>(),
    uploadAttachment: vi.fn<Api['uploadAttachment']>(),
    reactions: vi.fn<Api['reactions']>(),
    react: vi.fn<Api['react']>(),
    unreact: vi.fn<Api['unreact']>(),
    commentReaction: vi.fn<Api['commentReaction']>(),
    comments: vi.fn<Api['comments']>(),
    postComment: vi.fn<Api['postComment']>(),
    editComment: vi.fn<Api['editComment']>(),
    deleteComment: vi.fn<Api['deleteComment']>(),
  } satisfies Api
}
