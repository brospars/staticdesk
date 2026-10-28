import type { Database } from '@staticdesk/core'

type Workspace = Pick<Database['public']['Tables']['workspaces']['Row'], 'id' | 'name' | 'slug' | 'plan'>
type MemberRole = Database['public']['Enums']['member_role']

export interface WorkspaceMembership extends Workspace {
  role: MemberRole
}

/**
 * Workspaces the signed-in user belongs to, and the one currently selected
 * (remembered in a cookie).
 */
export function useWorkspaces() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const workspaces = useState<WorkspaceMembership[] | null>('workspaces', () => null)
  const currentId = useCookie<string | null>('sd-workspace', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })

  const current = computed(() =>
    workspaces.value?.find(w => w.id === currentId.value) ?? workspaces.value?.[0] ?? null,
  )

  async function refresh() {
    if (!user.value) {
      workspaces.value = []
      return workspaces.value
    }
    const { data, error } = await supabase
      .from('members')
      .select('role, workspace:workspaces!inner(id, name, slug, plan)')
      .eq('user_id', user.value.sub)
      .order('created_at')
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    workspaces.value = data.map(({ role, workspace }) => ({ ...workspace, role }))
    return workspaces.value
  }

  async function ensureLoaded() {
    return workspaces.value ?? await refresh()
  }

  function select(id: string) {
    currentId.value = id
  }

  return { workspaces, current, refresh, ensureLoaded, select }
}
