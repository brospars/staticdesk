/** Members of the current workspace (id, email, role), for assignees and authors. */
export function useWorkspaceMembers() {
  const supabase = useSupabaseClient()
  const { current } = useWorkspaces()

  const { data: members } = useAsyncData(
    () => `workspace-members:${current.value?.id}`,
    async () => {
      if (!current.value) return []
      const { data, error } = await supabase.rpc('workspace_members', { ws: current.value.id })
      if (error) throw error
      return data
    },
    { default: () => [] },
  )

  const byId = computed(() => new Map(members.value.map(member => [member.user_id, member])))

  /** Short name of a member: the part of their email before the @. */
  function memberName(userId: string | null | undefined) {
    if (!userId) return 'Someone'
    return byId.value.get(userId)?.email.split('@')[0] ?? 'Former member'
  }

  return { members, memberName }
}
