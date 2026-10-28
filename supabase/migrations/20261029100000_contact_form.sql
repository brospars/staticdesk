-- Contact form: custom field values, team notifications and outgoing webhooks.

-- Contact submissions now carry the values of the form's custom fields, as
-- label/value pairs so the inbox keeps them readable if the form changes.
drop function public.submit_contact(uuid, text, text, text, uuid, text, text);

create function public.submit_contact(
  site_id uuid,
  email text,
  message text,
  page_id text,
  widget_id uuid default null,
  name text default null,
  page_url text default null,
  fields jsonb default null
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
    jsonb_strip_nulls(jsonb_build_object(
      'pageId', submit_contact.page_id,
      'pageUrl', submit_contact.page_url,
      'fields', case when jsonb_typeof(submit_contact.fields) = 'array'
        and jsonb_array_length(submit_contact.fields) > 0 then submit_contact.fields end
    ))
  );

  insert into public.events (workspace_id, site_id, widget_id, type, page_id)
  values (ws, submit_contact.site_id, widget, 'submit', submit_contact.page_id);

  return thread;
end;
$$;

revoke all on function public.submit_contact from public, anon, authenticated;
grant execute on function public.submit_contact to service_role;

-- Email addresses of a workspace's members, for new message notifications.
-- Server only: dashboard users list members with workspace_members().
create function public.workspace_notification_emails(ws uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from public.members m
  join auth.users u on u.id = m.user_id
  where m.workspace_id = ws
    and u.email is not null
  order by m.created_at;
$$;

revoke all on function public.workspace_notification_emails from public, anon, authenticated;
grant execute on function public.workspace_notification_emails to service_role;

-- Outgoing webhooks ---------------------------------------------------------------

create type public.webhook_kind as enum ('custom', 'slack', 'discord');

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  kind public.webhook_kind not null default 'custom',
  url text not null check (url ~ '^https://' and char_length(url) <= 2000),
  -- Signs custom webhook bodies (StaticDesk-Signature header).
  secret text not null default 'whsec_' || encode(extensions.gen_random_bytes(24), 'hex'),
  events text[] not null default '{contact.submitted}',
  enabled boolean not null default true,
  -- Outcome of the latest delivery, written by the server.
  last_delivery_at timestamptz,
  last_status integer,
  last_error text check (char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade
);

create index webhooks_site_id_idx on public.webhooks (site_id);
create index webhooks_workspace_id_idx on public.webhooks (workspace_id);

create trigger webhooks_set_updated_at
  before update on public.webhooks
  for each row execute function private.set_updated_at();

alter table public.webhooks enable row level security;
revoke all on public.webhooks from anon;

-- Webhook secrets are sensitive: only owners and admins see or change webhooks.
create policy "Owners and admins manage webhooks"
  on public.webhooks for all to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])))
  with check ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

-- Delivery results are written by the server only.
revoke insert, update on public.webhooks from authenticated;
grant insert (workspace_id, site_id, kind, url, events, enabled) on public.webhooks to authenticated;
grant update (kind, url, events, enabled) on public.webhooks to authenticated;
