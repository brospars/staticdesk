-- Support for the public widget API: rate limiting and contact submissions.
-- Both functions are called by the server with the service role only.

-- Fixed-window counters, keyed by e.g. 'contact:<site>:<fingerprint>'.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create index rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Records a hit and returns true while the bucket is within max_hits for the
-- current window of window_seconds.
create function public.hit_rate_limit(bucket text, window_seconds integer, max_hits integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  current_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / window_seconds) * window_seconds
  );
  total integer;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (bucket, current_window, 1)
  on conflict (key, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into total;

  delete from public.rate_limits
  where key = bucket and window_start < current_window;

  -- Occasionally drop windows of buckets that went quiet.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return total <= max_hits;
end;
$$;

revoke all on function public.hit_rate_limit from public, anon, authenticated;
grant execute on function public.hit_rate_limit to service_role;

-- Stores a contact form submission atomically: upserts the contact, opens a
-- thread with the inbound message and records a 'submit' event.
-- Returns the new thread id.
create function public.submit_contact(
  site_id uuid,
  email text,
  message text,
  page_id text,
  widget_id uuid default null,
  name text default null,
  page_url text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
-- Parameters share column names; they are always referenced as submit_contact.<name>.
#variable_conflict use_column
declare
  ws uuid;
  contact uuid;
  thread uuid;
  widget uuid;
begin
  select s.workspace_id into ws from public.sites s where s.id = submit_contact.site_id;
  if ws is null then
    raise exception 'Unknown site' using errcode = 'no_data_found';
  end if;

  -- Ignore widget ids that are not a contact widget of this site.
  select w.id into widget
  from public.widgets w
  where w.id = submit_contact.widget_id
    and w.site_id = submit_contact.site_id
    and w.kind = 'contact';

  insert into public.contacts (workspace_id, email, name)
  values (ws, lower(submit_contact.email), nullif(trim(submit_contact.name), ''))
  on conflict (workspace_id, lower(email)) do update
    set name = coalesce(excluded.name, public.contacts.name)
  returning id into contact;

  insert into public.threads (workspace_id, site_id, widget_id, contact_id, subject)
  values (
    ws,
    submit_contact.site_id,
    widget,
    contact,
    left(split_part(trim(submit_contact.message), e'\n', 1), 120)
  )
  returning id into thread;

  insert into public.messages (workspace_id, thread_id, direction, body, metadata)
  values (
    ws,
    thread,
    'inbound',
    submit_contact.message,
    jsonb_strip_nulls(jsonb_build_object('pageId', submit_contact.page_id, 'pageUrl', submit_contact.page_url))
  );

  insert into public.events (workspace_id, site_id, widget_id, type, page_id)
  values (ws, submit_contact.site_id, widget, 'submit', submit_contact.page_id);

  return thread;
end;
$$;

revoke all on function public.submit_contact from public, anon, authenticated;
grant execute on function public.submit_contact to service_role;
