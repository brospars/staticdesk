-- Auto-replies: acknowledgements, out-of-office messages, rules with auto-labeling
-- and auto-assignment, delayed sending and follow-up reminders.

-- Workspace settings -----------------------------------------------------------------

-- Opening hours ({ enabled, timezone, days: [{ enabled, start, end }] }, Monday
-- first) decide when 'outside_hours' rules apply. Validated by the app.
alter table public.workspaces
  add column opening_hours jsonb not null default '{}'::jsonb
    check (jsonb_typeof(opening_hours) = 'object'),
  -- Members are reminded of open conversations left unanswered this long; null disables it.
  add column follow_up_hours integer check (follow_up_hours between 1 and 720);

grant update (opening_hours, follow_up_hours) on public.workspaces to authenticated;

-- Rules ----------------------------------------------------------------------------------

alter table public.auto_replies
  -- Rules are evaluated in this order; the first matching rule that sends an email wins.
  add column position integer not null default 0,
  add column send_email boolean not null default true,
  -- Labels added to matching conversations.
  add column add_labels text[] not null default '{}'
    check (cardinality(add_labels) <= 20 and array_position(add_labels, '') is null),
  -- Member assigned to matching conversations that have no assignee yet.
  add column assignee_id uuid,
  add constraint auto_replies_assignee_fkey foreign key (workspace_id, assignee_id)
    references public.members (workspace_id, user_id) on delete set null (assignee_id),
  add constraint auto_replies_conditions_check check (jsonb_typeof(conditions) = 'object');

-- A rule that only labels or assigns needs no email.
alter table public.auto_replies
  alter column subject drop not null,
  alter column body drop not null,
  add constraint auto_replies_email_check check (not send_email or (subject is not null and body is not null));

create index auto_replies_assignee_idx on public.auto_replies (workspace_id, assignee_id);

-- Automatic messages ------------------------------------------------------------------------

-- Auto-replies are outbound messages without an author, flagged in their metadata.
alter table public.messages drop constraint messages_check;
alter table public.messages
  add constraint messages_author_check
    check (direction = 'inbound' or author_id is not null or metadata ? 'autoReply');

-- Deliveries --------------------------------------------------------------------------------

-- One auto-reply per conversation at most, sent at send_at by the server
-- (right away, or by the /api/cron/automation job when the rule has a delay).
create table public.auto_reply_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  thread_id uuid not null unique,
  auto_reply_id uuid not null references public.auto_replies (id) on delete cascade,
  send_at timestamptz not null default now(),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'sent', 'skipped', 'failed')),
  -- Why the email was skipped or failed.
  reason text check (char_length(reason) <= 500),
  message_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (thread_id, workspace_id)
    references public.threads (id, workspace_id) on delete cascade
);

create index auto_reply_deliveries_due_idx
  on public.auto_reply_deliveries (send_at) where status = 'scheduled';
create index auto_reply_deliveries_workspace_idx on public.auto_reply_deliveries (workspace_id);
create index auto_reply_deliveries_rule_idx on public.auto_reply_deliveries (auto_reply_id);
create index auto_reply_deliveries_message_idx on public.auto_reply_deliveries (message_id);

create trigger auto_reply_deliveries_set_updated_at
  before update on public.auto_reply_deliveries
  for each row execute function private.set_updated_at();

alter table public.auto_reply_deliveries enable row level security;
revoke all on public.auto_reply_deliveries from anon;
-- Written by the server only; members see what is scheduled on a conversation.
revoke insert, update, delete on public.auto_reply_deliveries from authenticated;

create policy "Members can read auto-reply deliveries"
  on public.auto_reply_deliveries for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

-- Marks due deliveries as being sent and returns them, so concurrent jobs never
-- send the same email twice. Limited to one thread when given.
create function public.claim_auto_reply_deliveries(
  max_count integer default 50,
  thread uuid default null
)
returns setof public.auto_reply_deliveries
language sql
set search_path = ''
as $$
  update public.auto_reply_deliveries d
  set status = 'sending'
  where d.id in (
    select id from public.auto_reply_deliveries
    where status = 'scheduled'
      and send_at <= now()
      and (claim_auto_reply_deliveries.thread is null or thread_id = claim_auto_reply_deliveries.thread)
    order by send_at
    limit claim_auto_reply_deliveries.max_count
    for update skip locked
  )
  returning d.*;
$$;

revoke all on function public.claim_auto_reply_deliveries from public, anon, authenticated;
grant execute on function public.claim_auto_reply_deliveries to service_role;

-- Follow-up reminders ------------------------------------------------------------------------

-- When members were last reminded about the conversation. Written by the server.
alter table public.threads add column follow_up_notified_at timestamptz;

-- Open conversations whose latest message is from the visitor and older than the
-- workspace's follow_up_hours, not reminded since. Marks them as reminded and
-- returns them. Automatic replies do not count as an answer.
create function public.claim_follow_up_reminders(max_count integer default 100)
returns table (
  thread_id uuid,
  workspace_id uuid,
  subject text,
  waiting_since timestamptz,
  follow_up_hours integer
)
language sql
set search_path = ''
as $$
  with due as (
    select t.id, latest.created_at, w.follow_up_hours
    from public.threads t
    join public.workspaces w on w.id = t.workspace_id
    cross join lateral (
      select m.direction, m.created_at
      from public.messages m
      where m.thread_id = t.id
        and m.direction <> 'note'
        and not (m.metadata ? 'autoReply')
      order by m.created_at desc
      limit 1
    ) latest
    where w.follow_up_hours is not null
      and t.status = 'open'
      and latest.direction = 'inbound'
      and latest.created_at <= now() - make_interval(hours => w.follow_up_hours)
      and (t.follow_up_notified_at is null or t.follow_up_notified_at < latest.created_at)
    order by latest.created_at
    limit claim_follow_up_reminders.max_count
    for update of t skip locked
  )
  update public.threads t
  set follow_up_notified_at = now()
  from due
  where t.id = due.id
  returning t.id, t.workspace_id, t.subject, due.created_at, due.follow_up_hours;
$$;

revoke all on function public.claim_follow_up_reminders from public, anon, authenticated;
grant execute on function public.claim_follow_up_reminders to service_role;
