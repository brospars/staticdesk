-- Shared inbox: contacts (visitors), threads (conversations) and messages.

create type public.thread_status as enum ('open', 'pending', 'resolved');
create type public.message_direction as enum ('inbound', 'outbound', 'note');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (char_length(email) <= 320),
  name text check (char_length(name) <= 120),
  -- Set when the address bounces or complains: no more emails are sent to it.
  email_suppressed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create unique index contacts_workspace_email_idx
  on public.contacts (workspace_id, lower(email));

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function private.set_updated_at();

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  widget_id uuid,
  contact_id uuid not null,
  subject text check (char_length(subject) <= 300),
  status public.thread_status not null default 'open',
  assignee_id uuid references auth.users (id) on delete set null,
  labels text[] not null default '{}',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade,
  foreign key (widget_id, workspace_id)
    references public.widgets (id, workspace_id) on delete set null (widget_id),
  foreign key (contact_id, workspace_id)
    references public.contacts (id, workspace_id) on delete cascade
);

create index threads_inbox_idx
  on public.threads (workspace_id, status, last_message_at desc);
create index threads_site_id_idx on public.threads (site_id);
create index threads_contact_id_idx on public.threads (contact_id);
create index threads_assignee_id_idx on public.threads (assignee_id);

create trigger threads_set_updated_at
  before update on public.threads
  for each row execute function private.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id uuid not null,
  direction public.message_direction not null,
  -- Team member who wrote an outbound message or a note; null for inbound.
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 50000),
  -- RFC 5322 Message-ID, used to thread email replies.
  email_message_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (thread_id, workspace_id)
    references public.threads (id, workspace_id) on delete cascade,
  check (direction = 'inbound' or author_id is not null)
);

create index messages_thread_id_idx on public.messages (thread_id, created_at);
create index messages_workspace_id_idx on public.messages (workspace_id);
create index messages_author_id_idx on public.messages (author_id);

-- Keeps threads.last_message_at in sync (notes do not bump the thread).
create function private.touch_thread_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.direction <> 'note' then
    update public.threads
    set last_message_at = greatest(last_message_at, new.created_at)
    where id = new.thread_id;
  end if;
  return null;
end;
$$;

create trigger messages_touch_thread
  after insert on public.messages
  for each row execute function private.touch_thread_last_message();

-- Full-text search over message bodies.
create index messages_body_search_idx
  on public.messages using gin (to_tsvector('simple', body));

alter table public.contacts enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;

revoke all on public.contacts, public.threads, public.messages from anon;

create policy "Members can read contacts"
  on public.contacts for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Members can update contacts"
  on public.contacts for update to authenticated
  using ((select private.has_workspace_role(workspace_id)))
  with check ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins can delete contacts"
  on public.contacts for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

create policy "Members can read threads"
  on public.threads for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Members can update threads"
  on public.threads for update to authenticated
  using ((select private.has_workspace_role(workspace_id)))
  with check ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins can delete threads"
  on public.threads for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

create policy "Members can read messages"
  on public.messages for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

-- Members write notes directly. Outbound replies and inbound messages are
-- created by the server, which also sends or receives the email.
create policy "Members can add notes"
  on public.messages for insert to authenticated
  with check (
    direction = 'note'
    and author_id = (select auth.uid())
    and (select private.has_workspace_role(workspace_id))
  );

create policy "Owners and admins can delete messages"
  on public.messages for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

-- Dashboard users only change triage fields; ownership columns stay fixed.
revoke update on public.contacts, public.threads from authenticated;
grant update (name) on public.contacts to authenticated;
grant update (subject, status, assignee_id, labels) on public.threads to authenticated;
