-- Shared inbox: search, email replies, saved replies, notification preferences,
-- bounce handling, custom sending domains and realtime.

-- Search ------------------------------------------------------------------------

-- Escapes LIKE wildcards in user input.
create function private.escape_like(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(value, '\', '\\'), '%', '\%'), '_', '\_');
$$;

grant execute on function private.escape_like to authenticated;

-- Threads of a workspace matching the inbox filters, newest activity first.
-- SECURITY INVOKER: RLS limits the results to the caller's workspaces.
-- The query matches message bodies (full-text), the subject and the contact.
create function public.search_threads(
  ws uuid,
  query text default null,
  statuses public.thread_status[] default null,
  site uuid default null,
  assignee uuid default null,
  unassigned boolean default false,
  label text default null
)
returns setof public.threads
language sql
stable
set search_path = ''
as $$
  select t.*
  from public.threads t
  where t.workspace_id = search_threads.ws
    and (search_threads.statuses is null or t.status = any (search_threads.statuses))
    and (search_threads.site is null or t.site_id = search_threads.site)
    and (search_threads.assignee is null or t.assignee_id = search_threads.assignee)
    and (not coalesce(search_threads.unassigned, false) or t.assignee_id is null)
    and (search_threads.label is null or search_threads.label = any (t.labels))
    and (
      nullif(trim(search_threads.query), '') is null
      or t.subject ilike '%' || private.escape_like(trim(search_threads.query)) || '%'
      or exists (
        select 1 from public.contacts c
        where c.id = t.contact_id
          and (c.email ilike '%' || private.escape_like(trim(search_threads.query)) || '%'
            or c.name ilike '%' || private.escape_like(trim(search_threads.query)) || '%')
      )
      or exists (
        select 1 from public.messages m
        where m.thread_id = t.id
          and to_tsvector('simple', m.body) @@ websearch_to_tsquery('simple', search_threads.query)
      )
    )
  order by t.last_message_at desc, t.id;
$$;

revoke all on function public.search_threads from public, anon;
grant execute on function public.search_threads to authenticated;

-- Labels used in a workspace, for the inbox filters.
create function public.workspace_thread_labels(ws uuid)
returns setof text
language sql
stable
set search_path = ''
as $$
  select distinct unnest(t.labels) as label
  from public.threads t
  where t.workspace_id = workspace_thread_labels.ws
  order by label;
$$;

revoke all on function public.workspace_thread_labels from public, anon;
grant execute on function public.workspace_thread_labels to authenticated;

-- Labels stay short and free of duplicates.
alter table public.threads
  add constraint threads_labels_check check (
    cardinality(labels) <= 20
    and array_position(labels, '') is null
  );

-- Email replies -------------------------------------------------------------------

alter table public.contacts
  add column email_suppression_reason text check (char_length(email_suppression_reason) <= 500);

-- Stores a visitor's email reply on its thread and reopens the thread.
-- Idempotent on the email Message-ID (webhooks can be delivered twice).
-- Returns the new message id, or null when the reply was already stored.
create function public.receive_email_reply(
  thread_id uuid,
  body text,
  email_message_id text,
  from_email text default null,
  metadata jsonb default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  ws uuid;
  message uuid;
begin
  select t.workspace_id into ws from public.threads t where t.id = receive_email_reply.thread_id;
  if ws is null then
    raise exception 'Unknown thread' using errcode = 'no_data_found';
  end if;

  insert into public.messages (workspace_id, thread_id, direction, body, email_message_id, metadata)
  values (
    ws,
    receive_email_reply.thread_id,
    'inbound',
    left(receive_email_reply.body, 50000),
    receive_email_reply.email_message_id,
    coalesce(receive_email_reply.metadata, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object('source', 'email', 'from', lower(receive_email_reply.from_email)))
  )
  on conflict (email_message_id) do nothing
  returning id into message;

  if message is not null then
    update public.threads set status = 'open'
    where id = receive_email_reply.thread_id and status <> 'open';
  end if;

  return message;
end;
$$;

revoke all on function public.receive_email_reply from public, anon, authenticated;
grant execute on function public.receive_email_reply to service_role;

-- Stops emails to an address after a hard bounce or a spam complaint.
-- Returns the number of contacts updated.
create function public.suppress_email(address text, reason text)
returns integer
language sql
set search_path = ''
as $$
  with updated as (
    update public.contacts
    set email_suppressed_at = coalesce(email_suppressed_at, now()),
        email_suppression_reason = left(suppress_email.reason, 500)
    where lower(email) = lower(trim(suppress_email.address))
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke all on function public.suppress_email from public, anon, authenticated;
grant execute on function public.suppress_email to service_role;

-- Members may lift a suppression (e.g. after the visitor fixed their mailbox).
grant update (email_suppressed_at, email_suppression_reason) on public.contacts to authenticated;

-- Saved replies -------------------------------------------------------------------

create table public.saved_replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 20000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_replies_workspace_id_idx on public.saved_replies (workspace_id, title);
create index saved_replies_created_by_idx on public.saved_replies (created_by);

create trigger saved_replies_set_updated_at
  before update on public.saved_replies
  for each row execute function private.set_updated_at();

alter table public.saved_replies enable row level security;
revoke all on public.saved_replies from anon;

create policy "Members can read saved replies"
  on public.saved_replies for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Members can add saved replies"
  on public.saved_replies for insert to authenticated
  with check ((select private.has_workspace_role(workspace_id)));

create policy "Members can update saved replies"
  on public.saved_replies for update to authenticated
  using ((select private.has_workspace_role(workspace_id)))
  with check ((select private.has_workspace_role(workspace_id)));

create policy "Members can delete saved replies"
  on public.saved_replies for delete to authenticated
  using ((select private.has_workspace_role(workspace_id)));

revoke insert, update on public.saved_replies from authenticated;
grant insert (workspace_id, title, body) on public.saved_replies to authenticated;
grant update (title, body) on public.saved_replies to authenticated;

-- Notification preferences ------------------------------------------------------------

-- One row per member and workspace; a missing row means the defaults.
create table public.notification_preferences (
  workspace_id uuid not null,
  user_id uuid not null,
  -- New conversations: 'all' or 'none'.
  new_threads text not null default 'all' check (new_threads in ('all', 'none')),
  -- Visitor replies: 'all', 'assigned' (my threads and unassigned ones) or 'none'.
  replies text not null default 'assigned' check (replies in ('all', 'assigned', 'none')),
  daily_digest boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  foreign key (workspace_id, user_id)
    references public.members (workspace_id, user_id) on delete cascade
);

create index notification_preferences_user_id_idx on public.notification_preferences (user_id);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from anon;

create policy "Members manage their own notification preferences"
  on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.has_workspace_role(workspace_id)));

revoke insert, update on public.notification_preferences from authenticated;
grant insert (workspace_id, user_id, new_threads, replies, daily_digest) on public.notification_preferences to authenticated;
grant update (new_threads, replies, daily_digest) on public.notification_preferences to authenticated;

-- Email addresses of the members to notify, following their preferences:
-- kind 'new_thread', 'reply' (for the given thread) or 'digest'.
drop function public.workspace_notification_emails(uuid);

create function public.workspace_notification_emails(
  ws uuid,
  kind text default 'new_thread',
  thread uuid default null
)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from public.members m
  join auth.users u on u.id = m.user_id
  left join public.notification_preferences p
    on p.workspace_id = m.workspace_id and p.user_id = m.user_id
  left join public.threads t
    on t.id = workspace_notification_emails.thread and t.workspace_id = m.workspace_id
  where m.workspace_id = workspace_notification_emails.ws
    and u.email is not null
    and case workspace_notification_emails.kind
      when 'new_thread' then coalesce(p.new_threads, 'all') = 'all'
      when 'reply' then case coalesce(p.replies, 'assigned')
        when 'all' then true
        -- Unassigned threads concern everyone who follows their own threads.
        when 'assigned' then t.assignee_id is null or t.assignee_id = m.user_id
        else false
      end
      when 'digest' then coalesce(p.daily_digest, false)
      else false
    end
  order by m.created_at;
$$;

revoke all on function public.workspace_notification_emails from public, anon, authenticated;
grant execute on function public.workspace_notification_emails to service_role;

-- Custom sending domains ---------------------------------------------------------------

create table public.sending_domains (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  domain text not null check (
    char_length(domain) <= 253
    and domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  ),
  -- Local part of the sender address, e.g. 'support' for support@example.com.
  from_local_part text not null default 'support'
    check (from_local_part ~ '^[a-z0-9]([a-z0-9._+-]{0,62}[a-z0-9])?$'),
  -- Written by the server from the Resend API.
  provider_id text unique,
  status text not null default 'pending',
  records jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sending_domains_set_updated_at
  before update on public.sending_domains
  for each row execute function private.set_updated_at();

alter table public.sending_domains enable row level security;
revoke all on public.sending_domains from anon;

create policy "Members can read the sending domain"
  on public.sending_domains for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

-- Domains are created and verified by the server, which calls the Resend API.
-- Owners and admins only pick the sender address.
create policy "Owners and admins can update the sender address"
  on public.sending_domains for update to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

revoke insert, update, delete on public.sending_domains from authenticated;
grant update (from_local_part) on public.sending_domains to authenticated;

-- Realtime ------------------------------------------------------------------------------

-- The dashboard listens to new messages and thread changes (RLS applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.threads, public.messages;
  end if;
end;
$$;

-- Presence ("X is replying") uses the private channel 'inbox:<workspace id>'.
create function private.can_use_inbox_channel(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when topic ~ '^inbox:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.has_workspace_role(substr(topic, 7)::uuid)
    else false
  end;
$$;

revoke all on function private.can_use_inbox_channel from public;
grant execute on function private.can_use_inbox_channel to authenticated;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute $policy$
      create policy "Members can use their workspace inbox channel"
        on realtime.messages for all to authenticated
        using ((select private.can_use_inbox_channel(realtime.topic())))
        with check ((select private.can_use_inbox_channel(realtime.topic())))
    $policy$;
  end if;
end;
$$;
