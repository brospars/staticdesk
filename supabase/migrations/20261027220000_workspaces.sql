-- Workspaces, members and invitations.
--
-- Access model: dashboard users (Supabase Auth) reach their data through RLS.
-- Public widget traffic never touches these tables directly: it goes through the
-- Nuxt server API, which validates input and uses the service-role key.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.member_role as enum ('owner', 'admin', 'member');
create type public.plan as enum ('free', 'pro', 'team');

-- Keeps updated_at current on every UPDATE.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$'),
  plan public.plan not null default 'free',
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function private.set_updated_at();

create table public.members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index members_user_id_idx on public.members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (char_length(email) <= 320),
  role public.member_role not null default 'member' check (role <> 'owner'),
  -- Only a hash of the invitation token is stored; the token itself is emailed.
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_workspace_id_idx on public.invitations (workspace_id);
create unique index invitations_pending_email_idx
  on public.invitations (workspace_id, lower(email))
  where accepted_at is null;

-- True when the current user is a member of the workspace with one of the roles.
-- SECURITY DEFINER so policies on members can use it without recursing into RLS.
create function private.has_workspace_role(
  ws uuid,
  roles public.member_role[] default array['owner', 'admin', 'member']::public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

revoke all on function private.has_workspace_role from public;
grant usage on schema private to authenticated;
grant execute on function private.has_workspace_role to authenticated;

-- A workspace must always keep at least one owner.
create function private.ensure_workspace_has_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner'
    and exists (select 1 from public.workspaces w where w.id = old.workspace_id)
    and not exists (
      select 1 from public.members m
      where m.workspace_id = old.workspace_id and m.role = 'owner'
    )
  then
    raise exception 'A workspace must keep at least one owner'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger members_keep_one_owner
  after update or delete on public.members
  deferrable initially deferred
  for each row execute function private.ensure_workspace_has_owner();

-- Creates a workspace and makes the caller its owner, atomically.
create function public.create_workspace(name text, slug text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws public.workspaces;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  insert into public.workspaces (name, slug)
  values (create_workspace.name, create_workspace.slug)
  returning * into ws;

  insert into public.members (workspace_id, user_id, role)
  values (ws.id, (select auth.uid()), 'owner');

  return ws;
end;
$$;

revoke all on function public.create_workspace from public, anon;
grant execute on function public.create_workspace to authenticated;

alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;

revoke all on public.workspaces, public.members, public.invitations from anon;

-- workspaces: created through create_workspace() only.
create policy "Members can read their workspaces"
  on public.workspaces for select to authenticated
  using ((select private.has_workspace_role(id)));

create policy "Owners and admins can update their workspace"
  on public.workspaces for update to authenticated
  using ((select private.has_workspace_role(id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_workspace_role(id, array['owner', 'admin']::public.member_role[])));

create policy "Owners can delete their workspace"
  on public.workspaces for delete to authenticated
  using ((select private.has_workspace_role(id, array['owner']::public.member_role[])));

-- Billing columns are written by the server (service role) only.
revoke update on public.workspaces from authenticated;
grant update (name, slug) on public.workspaces to authenticated;

-- members
create policy "Members can read the members of their workspaces"
  on public.members for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

-- Admins can add admins and members; only owners can add owners.
create policy "Owners and admins can add members"
  on public.members for insert to authenticated
  with check (
    (select private.has_workspace_role(workspace_id, array['owner']::public.member_role[]))
    or (
      role <> 'owner'
      and (select private.has_workspace_role(workspace_id, array['admin']::public.member_role[]))
    )
  );

create policy "Owners can change member roles"
  on public.members for update to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner']::public.member_role[])))
  with check ((select private.has_workspace_role(workspace_id, array['owner']::public.member_role[])));

-- Anyone can leave; owners can remove anyone; admins can remove non-owners.
create policy "Members can leave, owners and admins can remove members"
  on public.members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_workspace_role(workspace_id, array['owner']::public.member_role[]))
    or (
      role <> 'owner'
      and (select private.has_workspace_role(workspace_id, array['admin']::public.member_role[]))
    )
  );

-- invitations
create policy "Owners and admins manage invitations"
  on public.invitations for all to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));
