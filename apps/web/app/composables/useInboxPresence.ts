import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceState {
  userId: string
  email: string
  threadId: string | null
  typing: boolean
}

/**
 * Shares which conversation each member is looking at and whether they are
 * writing a reply, on the private Realtime channel of the workspace inbox.
 */
export function useInboxPresence(threadId: Ref<string | null>) {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { current } = useWorkspaces()

  const others = ref<PresenceState[]>([])
  const typing = ref(false)
  let channel: RealtimeChannel | null = null

  function state(): PresenceState | null {
    if (!user.value) return null
    return { userId: user.value.sub, email: String(user.value.email ?? ''), threadId: threadId.value, typing: typing.value }
  }

  async function track() {
    const presence = state()
    if (channel && presence) await channel.track(presence)
  }

  async function join(workspaceId: string) {
    await leave()
    await supabase.realtime.setAuth()
    channel = supabase.channel(`inbox:${workspaceId}`, {
      config: { private: true, presence: { key: user.value?.sub } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        const entries = Object.values(channel!.presenceState<PresenceState>()).flat()
        others.value = entries.filter(entry => entry.userId !== user.value?.sub)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') track()
      })
  }

  async function leave() {
    if (!channel) return
    await supabase.removeChannel(channel)
    channel = null
    others.value = []
  }

  onMounted(() => {
    watch(() => current.value?.id, (id) => {
      if (id) join(id)
    }, { immediate: true })
    watch([threadId, typing], track)
  })
  onBeforeUnmount(leave)

  const viewers = computed(() => others.value.filter(other => threadId.value && other.threadId === threadId.value))
  const writers = computed(() => viewers.value.filter(viewer => viewer.typing))

  return { typing, viewers, writers }
}
