-- Auto-replies, analytics events and billing state.

create type public.auto_reply_trigger as enum ('new_thread', 'outside_hours');
create type public.event_type as enum ('view', 'open', 'submit', 'comment', 'reaction', 'review');

create table public.auto_replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Null applies the rule to every site of the workspace.
  site_id uuid,
  name text not null check (char_length(name) between 1 and 120),
  enabled boolean not null default true,
  trigger public.auto_reply_trigger not null default 'new_thread',
  -- Matching rules (widget, keywords, field values) and opening hours.
  conditions jsonb not null default '{}'::jsonb,
  subject text not null check (char_length(subject) between 1 and 300),
  -- Template with variables such as {{name}} and {{site}}.
  body text not null check (char_length(body) between 1 and 20000),
  delay_minutes integer not null default 0 check (delay_minutes between 0 and 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade
);

create index auto_replies_workspace_id_idx on public.auto_replies (workspace_id);
create index auto_replies_site_id_idx on public.auto_replies (site_id);

create trigger auto_replies_set_updated_at
  before update on public.auto_replies
  for each row execute function private.set_updated_at();

-- Raw widget events. Aggregated into daily stats by a scheduled job (phase 8).
create table public.events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  site_id uuid not null,
  widget_id uuid,
  type public.event_type not null,
  page_id text check (char_length(page_id) <= 500),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade,
  foreign key (widget_id, workspace_id)
    references public.widgets (id, workspace_id) on delete set null (widget_id)
);

create index events_site_time_idx on public.events (site_id, occurred_at desc);
create index events_workspace_time_idx on public.events (workspace_id, occurred_at desc);
create index events_widget_id_idx on public.events (widget_id);

-- Mirror of the Stripe subscription (SaaS edition). Written by the webhook only.
create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();

alter table public.auto_replies enable row level security;
alter table public.events enable row level security;
alter table public.subscriptions enable row level security;

revoke all on public.auto_replies, public.events, public.subscriptions from anon;

create policy "Members can read auto-replies"
  on public.auto_replies for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins manage auto-replies"
  on public.auto_replies for all to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

create policy "Members can read events"
  on public.events for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Members can read their subscription"
  on public.subscriptions for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));
