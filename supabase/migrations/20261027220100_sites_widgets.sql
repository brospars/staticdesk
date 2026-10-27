-- Sites (an embedding origin with a public key) and their widgets.
--
-- Child tables carry workspace_id for simple RLS checks. Composite foreign keys
-- guarantee it always matches the parent's workspace.

create type public.widget_kind as enum ('contact', 'comments', 'reactions', 'reviews');

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  -- Public identifier used in the embed snippet (data-site="pk_…"). Not a secret.
  public_key text not null unique
    default 'pk_' || encode(extensions.gen_random_bytes(12), 'hex'),
  -- Origins allowed to call the public API, e.g. {https://docs.example.com}.
  allowed_origins text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create index sites_workspace_id_idx on public.sites (workspace_id);

create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function private.set_updated_at();

create table public.widgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  kind public.widget_kind not null,
  name text not null check (char_length(name) between 1 and 120),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade
);

create index widgets_site_id_idx on public.widgets (site_id);
create index widgets_workspace_id_idx on public.widgets (workspace_id);

create trigger widgets_set_updated_at
  before update on public.widgets
  for each row execute function private.set_updated_at();

alter table public.sites enable row level security;
alter table public.widgets enable row level security;

revoke all on public.sites, public.widgets from anon;

create policy "Members can read sites"
  on public.sites for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins manage sites"
  on public.sites for all to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

create policy "Members can read widgets"
  on public.widgets for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins manage widgets"
  on public.widgets for all to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));
