/** Number of comments of the current workspace waiting for approval. */
export function usePendingComments() {
  const supabase = useSupabaseClient()
  const { current } = useWorkspaces()

  const { data: pendingComments, refresh: refreshPendingComments } = useAsyncData(
    () => `pending-comments:${current.value?.id}`,
    async () => {
      if (!current.value) return 0
      const { count, error } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', current.value.id)
        .eq('status', 'pending')
        .is('deleted_at', null)
      if (error) throw error
      return count ?? 0
    },
    { default: () => 0 },
  )

  return { pendingComments, refreshPendingComments }
}
