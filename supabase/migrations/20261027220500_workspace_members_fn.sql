-- Lists the members of a workspace with their email, for the members page.
-- auth.users is not exposed, so this SECURITY DEFINER function returns only
-- the columns needed, and only to members of that workspace.
create function public.workspace_members(ws uuid)
returns table (
  user_id uuid,
  email text,
  role public.member_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.members m
  join auth.users u on u.id = m.user_id
  where m.workspace_id = ws
    and private.has_workspace_role(ws)
  order by m.created_at;
$$;

revoke all on function public.workspace_members from public, anon;
grant execute on function public.workspace_members to authenticated;
